import { PushDrop, Utils, Transaction, type WalletOutput, CreateActionInput, IdentityClient, Beef, LookupResolver, TopicBroadcaster, SignActionSpend, WalletClient } from '@bsv/sdk'
import { Option, PollQuery, Poll } from '../types/types'
import { LookupQuestion } from '@bsv/overlay'
type PollrDeps = {
  getClients: () => Promise<{
    wallet: WalletClient;
    resolver: LookupResolver;
    broadcaster: TopicBroadcaster;
  }>;
  getAvatarCached: (identityKey: string) => Promise<string>;
}

/**
 * Creates a new poll by locking poll information into a token.
 * The poll metadata includes the poll name, description, type, options and a timestamp.
 *
 * @param pollName - The name of the poll
 * @param pollDescription - The description of the poll
 * @param optionsType - The type of options for the poll (e.g. text)
 * @param options - An array of options for the poll
 * @returns void
 */
export async function submitCreatePolls({
  pollName,
  pollDescription,
  optionsType,
  options, }: {
    pollName: string,
    pollDescription: string,
    optionsType: string,
    options: Option[]
  }, deps: PollrDeps): Promise<string> {
  const { wallet, broadcaster } = await deps.getClients()

  const pollCreator = await wallet.getPublicKey({ identityKey: true })

  const PD = new PushDrop(wallet)
  const fields = [
    Buffer.from("open", "utf8"),
    Buffer.from('' + pollCreator.publicKey, "utf8"),           // Ensure walID is a string
    Buffer.from('' + pollName, "utf8"),
    Buffer.from('' + pollDescription, "utf8"),
    Buffer.from('' + options.length.toString(), "utf8"),
    Buffer.from('' + optionsType, "utf8"),
    Buffer.from('' + Math.floor(Date.now() / 1000).toString(), "utf8"),
    ...options.map((opt) => Buffer.from(opt.value, "utf8"))
  ]
  const writer = new Utils.Writer()

  for (const field of fields) {
    writer.writeVarIntNum(field.length)
    writer.write(Array.from(field))
  }
  const flattenedArray = writer.toArray()

  const OutputScript = await PD.lock(
    [flattenedArray],
    [2, 'pollr'],
    '1',
    'self'
  )

  const newPollToken = await wallet.createAction({
    outputs: [{
      lockingScript: OutputScript.toHex(),
      satoshis: 1,
      basket: 'myPolls',
      outputDescription: 'New Poll'
    }],
    options: {
      randomizeOutputs: false,
      acceptDelayedBroadcast: false
    },
    description: `Create a Poll: ${pollName}`
  })

  const tx = Transaction.fromAtomicBEEF(newPollToken.tx!)
  if (!tx) {
    throw new Error("Transaction creation failed: tx is undefined")
  }
  const beef = tx.toBEEF()


  const broadcasterResult = await broadcaster.broadcast(tx)
  if (broadcasterResult.status === 'error') {
    throw new Error('Transaction failed to broadcast')
  }
  return newPollToken.txid!
}

/**
 * Submits a vote for a given poll by locking the vote data into a vote token.
 *
 * @param poll - The poll object representing the poll to vote in
 * @param index - The selected option index (as string) for the vote
 * @returns void
 */
export async function submitVote({
  poll,
  index }: {
    poll: Poll
    index: string
  }, deps: PollrDeps) {
  const { wallet, broadcaster } = await deps.getClients()
  const pollCreator = await wallet.getPublicKey({ identityKey: true })


  const PD = new PushDrop(wallet)
  const fields = [
    Buffer.from("vote", "utf8"),
    Buffer.from('' + pollCreator.publicKey, "utf8"),
    Buffer.from('' + poll.id, "utf8"),
    Buffer.from('' + index, "utf8"),
  ]
  const writer = new Utils.Writer()

  for (const field of fields) {
    writer.writeVarIntNum(field.length)
    writer.write(Array.from(field))
  }
  const flattenedArray = writer.toArray()

  const OutputScript = await PD.lock(
    [flattenedArray],
    [2, 'pollr'],
    '1',
    poll.key
  )

  const newPollToken = await wallet.createAction({
    outputs: [{
      lockingScript: OutputScript.toHex(),
      satoshis: 1,
      basket: 'myVotes',
      outputDescription: `Vote Token for poll: ${poll.id} `
    }],
    options: {
      randomizeOutputs: false,
      acceptDelayedBroadcast: false
    },
    description: `Voting choice: ${index}`
  })
  const tx = Transaction.fromAtomicBEEF(newPollToken.tx!)
  if (!tx) {
    throw new Error("Transaction creation failed: tx is undefined")
  }
  const broadcasterResult = await broadcaster.broadcast(tx)
  if (broadcasterResult.status === 'error') {
    throw new Error('Transaction failed to broadcast')
  }
}

/**
 * Closes a poll by aggregating all vote tokens, replacing poll metadata status to "close", and appending final vote counts.
 *
 * @param pollId - The unique identifier (transaction ID) of the poll to be closed
 * @returns void
 */
export async function closePoll({
  pollId
}: {
  pollId: string
}, deps: PollrDeps) {
  const { wallet, broadcaster } = await deps.getClients()
  let query = {} as PollQuery
  query.txid = pollId
  query.type = 'allvotesfor'
  let question = {} as LookupQuestion
  question.query = query
  question.service = 'ls_pollr'

  const network = (await wallet.getNetwork()).network
  const resolver = new LookupResolver({
    networkPreset: location.hostname === 'localhost' ? 'local' : network
  })
  const lookupResult = await resolver.query(question)

  if (lookupResult.type !== 'output-list') {
    throw new Error('Lookup result type must be output-list')
  }

  let votes: string[][] = []
  for (const output of lookupResult.outputs) {
    const parsedTransaction = Transaction.fromBEEF(output.beef)
    const decoded = PushDrop.decode(
      parsedTransaction.outputs[output.outputIndex].lockingScript
    )

    const reader = new Utils.Reader(decoded.fields[0])
    const decodedFields: string[] = []
    while (!reader.eof()) {
      const fieldLength = reader.readVarIntNum()
      const fieldBytes = reader.read(fieldLength)
      decodedFields.push(Utils.toUTF8(fieldBytes))
    }
    votes.push(decodedFields)
  }

  // Initialize vote counts based on allowed poll options
  const voteCounts: Record<string, number> = {} as Record<string, number>
  const voteOptions = await getPollOptions(pollId, deps)
  voteOptions.forEach(option => {
    voteCounts[option] = 0
  })

  // Count the votes only for allowed options
  votes.forEach(vote => {
    const option = vote[3]
    if (option in voteCounts) {
      voteCounts[option] += 1
    }
  })
  const voteCountsArray: Record<string, number>[] = voteOptions.map(option => ({
    [option]: voteCounts[option]
  }))
  console.log(`${JSON.stringify(voteCountsArray)}`)
  // Retrieve the original (open) poll token to get poll information
  let opentoken = await getPoll(pollId, deps)
  const decodedOpenToken = PushDrop.decode(opentoken.outputs[0].lockingScript)

  // Decode all fields from the open token
  const openReader = new Utils.Reader(decodedOpenToken.fields[0])
  const openFields: Buffer[] = []
  while (!openReader.eof()) {
    const fieldLength = openReader.readVarIntNum()
    const fieldBytes = openReader.read(fieldLength)
    openFields.push(Buffer.from(fieldBytes))
  }

  // We only want the metadata (first 7 fields), so discard the options.
  const metadataFields = openFields.slice(0, 7)

  // Replace the first field "open" with "close"
  if (metadataFields.length > 0) {
    metadataFields[0] = Buffer.from("close", "utf8")
  }

  // Create a new writer and add the modified metadata fields
  const writer = new Utils.Writer()
  for (const field of metadataFields) {
    writer.writeVarIntNum(field.length)
    writer.write(Array.from(field))
  }

  // Append the vote counts from the voteCountsArray
  for (const voteObj of voteCountsArray) {
    const key = Object.keys(voteObj)[0]
    const value = voteObj[key]

    const keyBuffer = Buffer.from(key, "utf8")
    writer.writeVarIntNum(keyBuffer.length)
    writer.write(Array.from(keyBuffer))

    const valueBuffer = Buffer.from(String(value), "utf8")
    writer.writeVarIntNum(valueBuffer.length)
    writer.write(Array.from(valueBuffer))
  }

  const data = writer.toArray()

  // Use the combined data to create the locking script for the close token
  const lockingScript = await new PushDrop(wallet).lock(
    [data],
    [2, 'pollr'],
    '1',
    'self'
  )

  // Build inputs from the original open token and vote tokens
  const beefer = new Beef()
  const inputs: CreateActionInput[] = []
  inputs.push({
    outpoint: opentoken.id('hex') + '.0',
    unlockingScriptLength: 74,
    inputDescription: 'openToken'
  })
  beefer.mergeBeef(opentoken.toAtomicBEEF())
  for (const vote of lookupResult.outputs) {
    let beef = Transaction.fromBEEF(vote.beef)
    inputs.push({
      outpoint: beef.id('hex') + ".0",
      unlockingScriptLength: 74,
      inputDescription: 'voteToken'
    })
    beefer.mergeBeef(vote.beef)
  }

  const { signableTransaction } = await wallet.createAction({
    description: `Closing token`,
    inputBEEF: beefer.toBinary(),
    inputs,
    outputs: [{
      lockingScript: lockingScript.toHex(),
      satoshis: 1,
      outputDescription: 'close token'
    }],
    options: {
      acceptDelayedBroadcast: false,
      randomizeOutputs: false
    }
  })
  if (signableTransaction === undefined) {
    throw new Error('Failed to create signable transaction')
  }
  const tx = Transaction.fromAtomicBEEF(signableTransaction.tx!)
  const pd = new PushDrop(wallet)
  const spends: Record<number, SignActionSpend> = {}

  // Sign the open token input
  let unlocker = pd.unlock(
    [2, 'pollr'],
    '1',
    'self'
  )
  let unlockingScript = (await unlocker.sign(tx, 0)).toHex()
  spends[0] = { unlockingScript }

  // Sign vote token inputs – note that we use each vote token’s associated key
  for (let i = 1; i < inputs.length; i++) {
    unlocker = pd.unlock(
      [2, 'pollr'],
      '1',
      votes[i - 1][1]
    )
    unlockingScript = (await unlocker.sign(tx, i)).toHex()
    spends[i] = { unlockingScript }
  }
  const { tx: completedTx } = await wallet.signAction({
    reference: signableTransaction.reference,
    spends,
    options: {}
  })
  const parsedCompletedTx = Transaction.fromAtomicBEEF(completedTx!)
  await broadcaster.broadcast(parsedCompletedTx)
}

/**
 * Fetches all open polls from the LS polling service.
 *
 * @returns A promise that resolves to an array of Poll objects representing all open polls.
 */
export async function fetchAllOpenPolls(deps: PollrDeps): Promise<Poll[]> {
  let query = {} as PollQuery
  query.type = 'allpolls'
  query.status = "open"
  let question = {} as LookupQuestion
  question.query = query
  question.service = 'ls_pollr'
  const { resolver } = await deps.getClients()

  const lookupResult = await resolver.query(question)

  if (lookupResult.type !== 'output-list') {
    throw new Error('Must be of type output list')
  }

  let pollsData: string[][] = []
  for (const output of lookupResult.outputs) {

    const parsedTransaction = Transaction.fromBEEF(output.beef)
    const decoded = await PushDrop.decode(parsedTransaction.outputs[0].lockingScript)

    const reader = new Utils.Reader(decoded.fields[0])
    const decodedFields = []
    while (!reader.eof()) {
      const fieldLength = reader.readVarIntNum()
      const fieldBytes = reader.read(fieldLength)
      decodedFields.push(Utils.toUTF8(fieldBytes))
    }
    decodedFields.push(parsedTransaction.id('hex'))
    pollsData.push(decodedFields)
  }

  const polls: Poll[] = await Promise.all(
    pollsData.map(async (row: string[]) => ({
      key: row[1],
      avatarUrl: await deps.getAvatarCached(row[1]),
      id: row.pop()!.toString(),
      name: row[2],
      desc: row[3],
      date: row[6],
      status: 'open',
      optionstype: row[5],
    }))
  )

  return polls
}

/**
 * Fetches vote tokens for an open poll and aggregates vote counts for allowed options.
 *
 * @param pollId - The unique identifier (transaction ID) of the poll
 * @returns A promise that resolves to an array of records with each record mapping a poll option to its vote count
 */
export async function fetchOpenVotes(pollId: string, deps: PollrDeps): Promise<Record<string, number>[]> {
  let query = {} as PollQuery
  query.type = 'allvotesfor'
  query.status = 'open'

  query.txid = pollId
  let question = {} as LookupQuestion
  question.query = query
  question.service = 'ls_pollr'
  const { resolver } = await deps.getClients()


  const lookupResult = await resolver.query(question)

  if (lookupResult.type !== 'output-list') {
    throw new Error('Lookup result type must be output-list')
  }
  let votes: string[][] = []
  for (const output of lookupResult.outputs) {

    const parsedTransaction = Transaction.fromBEEF(output.beef)
    const decoded = await PushDrop.decode(parsedTransaction.outputs[0].lockingScript)

    const reader = new Utils.Reader(decoded.fields[0])
    const decodedFields = []
    while (!reader.eof()) {
      const fieldLength = reader.readVarIntNum()
      const fieldBytes = reader.read(fieldLength)
      decodedFields.push(Utils.toUTF8(fieldBytes))
    }
    votes.push(decodedFields)
  }
  const voteCounts: Record<string, number> = {} as Record<string, number>
  const voteOptions = await getPollOptions(pollId, deps)
  voteOptions.forEach(option => {
    voteCounts[option] = 0
  })

  // Count the votes only for allowed options.
  votes.forEach(vote => {
    const option = vote[3]
    if (option in voteCounts) {
      voteCounts[option] += 1
    }
  })
  const voteCountsArray: Record<string, number>[] = voteOptions.map(option => ({ [option]: voteCounts[option] }))

  return voteCountsArray
}

/**
 * Fetches polls created by the current user using the wallet's identity.
 *
 * @returns A promise that resolves to an array of formatted poll objects representing the user's polls.
 */
export async function fetchMypolls(deps: PollrDeps) {
  const { wallet } = await deps.getClients()
  let formattedPoll: {}[] = []
  try {
    const walID = await wallet.getPublicKey({
      identityKey: true
    })

    const pollFromBasket = await wallet.listOutputs({
      basket: 'myPolls',
      include: 'entire transactions'
    })
    let localpolls: string[][] = []
    const polls = await Promise.all(pollFromBasket.outputs.map(async (task: WalletOutput, i: number) => {
      try {
        const tx = Transaction.fromBEEF(pollFromBasket.BEEF as number[], task.outpoint.split('.')[0])
        const lockingScript = tx!.outputs[0].lockingScript
        const decodedOutput = await PushDrop.decode(lockingScript)
        const reader = new Utils.Reader(decodedOutput.fields[0])
        const decodedFields = []
        while (!reader.eof()) {
          const fieldLength = reader.readVarIntNum()
          const fieldBytes = reader.read(fieldLength)
          decodedFields.push(Utils.toUTF8(fieldBytes))
        }
        decodedFields.push(pollFromBasket.outputs[i].outpoint.split('.')[0])
        localpolls.push(decodedFields)
      }
      catch (e) {
        console.log(`error decoding polls ${e}`)
      }
    }))
    for (let i = 0; i < localpolls.length; i++) {
      const poll = localpolls[i]
      let id = poll.pop()!
      formattedPoll.push({
        key: walID.publicKey,
        avatarUrl: await deps.getAvatarCached(walID.publicKey),
        id: id,
        name: poll[2],
        desc: poll[3],
        date: poll[6],
        optionstype: poll[5]
      })
    }
  }
  catch (e) {
    console.log(`error finding basket polls:${e}`)
  }
  return formattedPoll

}

/**
 * Retrieves all closed polls from the LS polling service.
 *
 * @returns A promise that resolves to an array of Poll objects representing closed polls.
 */
export async function getClosedPolls(deps: PollrDeps) {
  let query = {} as PollQuery
  query.type = 'allpolls'
  query.status = "closed"
  let question = {} as LookupQuestion
  question.query = query
  question.service = 'ls_pollr'
  const { wallet, resolver } = await deps.getClients()

  const lookupResult = await resolver.query(question)

  if (lookupResult.type !== 'output-list') {
    throw new Error('Lookup result type must be output-list')
  }
  const PD = new PushDrop(wallet)
  let pollsData: string[][] = []
  for (const output of lookupResult.outputs) {

    const parsedTransaction = Transaction.fromBEEF(output.beef)
    const decoded = await PushDrop.decode(parsedTransaction.outputs[0].lockingScript)

    const reader = new Utils.Reader(decoded.fields[0])
    const decodedFields = []
    while (!reader.eof()) {
      const fieldLength = reader.readVarIntNum()
      const fieldBytes = reader.read(fieldLength)
      decodedFields.push(Utils.toUTF8(fieldBytes))
    }
    decodedFields.push(parsedTransaction.id('hex'))
    pollsData.push(decodedFields)
  }
  console.log(`closed polls: ${JSON.stringify(pollsData)}`)

  const polls: Poll[] = await Promise.all(
    pollsData.map(async (row: string[]) => ({
      key: row[1],
      avatarUrl: await deps.getAvatarCached(row[1]),
      id: row.pop()!.toString(),
      name: row[2],
      desc: row[3],
      date: row[6],
      status: 'closed',
      optionstype: row[5],
    }))
  )

  console.log(`closed returning polls: ${JSON.stringify(polls)}`)
  return polls
}

/**
 * Retrieves the poll options for an open poll.
 *
 * @param pollId - The unique identifier (transaction ID) of the poll
 * @returns A promise that resolves to an array of strings representing the poll options.
 */
export async function getPollOptions(pollId: string, deps: PollrDeps): Promise<string[]> {
  const { wallet, resolver } = await deps.getClients()
  let query = {} as PollQuery
  query.type = 'poll'
  query.status = 'open'
  query.txid = pollId
  let question = {} as LookupQuestion
  question.query = query
  question.service = 'ls_pollr'
  const lookupResult = await resolver.query(question)
  if (lookupResult.type !== 'output-list') {
    throw new Error('Lookup result type must be output-list')
  }
  const parsedTransaction = Transaction.fromBEEF(lookupResult.outputs[0].beef)
  const decoded = PushDrop.decode(parsedTransaction.outputs[0].lockingScript)

  const reader = new Utils.Reader(decoded.fields[0])
  const decodedFields = []
  while (!reader.eof()) {
    const fieldLength = reader.readVarIntNum()
    const fieldBytes = reader.read(fieldLength)
    decodedFields.push(Utils.toUTF8(fieldBytes))
  }

  return decodedFields.slice(7)
}

/**
 * Retrieves poll results for a closed poll by parsing vote counts from the closing token.
 *
 * @param pollId - The unique identifier (transaction ID) of the poll
 * @returns A promise that resolves to an array of records mapping each poll option to its vote count.
 */
export async function getPollResults(pollId: string, deps: PollrDeps): Promise<Record<string, number>[]> {
  let query = {} as PollQuery
  query.type = 'poll'
  query.status = 'closed'

  query.txid = pollId
  let question = {} as LookupQuestion
  question.query = query
  question.service = 'ls_pollr'
  const { resolver } = await deps.getClients()

  const lookupResult = await resolver.query(question)

  if (lookupResult.type !== 'output-list') {
    throw new Error('Lookup result type must be output-list')
  }
  let parsedTransaction = Transaction.fromBEEF(lookupResult.outputs[0].beef)
  const decoded = await PushDrop.decode(parsedTransaction.outputs[0].lockingScript)

  const reader = new Utils.Reader(decoded.fields[0])
  const decodedFields = []
  while (!reader.eof()) {
    const fieldLength = reader.readVarIntNum()
    const fieldBytes = reader.read(fieldLength)
    decodedFields.push(Utils.toUTF8(fieldBytes))
  }
  let resultingVotes: Record<string, number>[] = []
  const results = decodedFields.slice(7)
  for (let i = 0; i < results.length; i += 2) {
    const option = results[i]
    const count = Number(results[i + 1])
    resultingVotes.push({ [option]: count })
  }
  console.log(`${JSON.stringify(resultingVotes)}`)
  return resultingVotes
}

/**
 * Retrieves the open poll token (transaction) for the specified poll.
 *
 * @param pollId - The unique identifier (transaction ID) of the poll
 * @returns A promise that resolves to a Transaction object representing the open poll token.
 */
export async function getPoll(pollId: string, deps: PollrDeps): Promise<Transaction> {
  const { wallet, resolver } = await deps.getClients()
  let query = {} as PollQuery
  query.type = 'poll'
  query.status = 'open'
  query.txid = pollId
  let question = {} as LookupQuestion
  question.query = query
  question.service = 'ls_pollr'
  const lookupResult = await resolver.query(question)
  if (lookupResult.type !== 'output-list') {
    throw new Error('Lookup result type must be output-list')
  }

  return Transaction.fromBEEF(lookupResult.outputs[0].beef)
}

/**
 * Retrieves the avatar URL for a given identity key.
 *
 * @param identityKey - The identity key used for lookup
 * @returns A promise that resolves to a string representing the avatar URL (or an empty string if not found)
 */
export async function getAvatar(identityKey: string, deps: PollrDeps): Promise<string> {
  let avatarUrl: string = ''
  const { wallet } = await deps.getClients()
  try {
    const identityClient = new IdentityClient(wallet)
    const identities = await identityClient.resolveByIdentityKey({
      identityKey: identityKey
    })
    if (identities.length > 0) {
      avatarUrl = identities[0]?.avatarURL
    }
  } catch (error) {
    console.error('Error fetching identity:', error)
  }
  return avatarUrl
}