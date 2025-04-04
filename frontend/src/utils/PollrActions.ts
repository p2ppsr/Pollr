import { WalletClient, PushDrop, Utils, Transaction, type WalletOutput, CreateActionInput, IdentityClient, Beef, LookupResolver, TopicBroadcaster } from '@bsv/sdk'
import { Option, PollQuery, Poll } from '../types/types'
import { LookupQuestion } from '@bsv/overlay'
export async function submitCreatePolls({
    pollName,
    pollDescription,
    optionsType,
    options, }: {
        pollName: string,
        pollDescription: string,
        optionsType: string,
        options: Option[]
    }):
    Promise<string> {
    const walletClient = new WalletClient()
    const walID = await walletClient.getPublicKey({
        identityKey: true
    })

    const PD = new PushDrop(walletClient)
    const fields = [
        Buffer.from("open", "utf8"),
        Buffer.from('' + walID.publicKey, "utf8"),           // Ensure walID is a string
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
        [0, 'testpoll'],
        '1',
        'self'
    )

    const newPollToken = await walletClient.createAction({
        outputs: [{
            lockingScript: OutputScript.toHex(),
            satoshis: 1,
            basket: 'test',
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

    console.log(`sending ${beef}`)
    const network = (await walletClient.getNetwork()).network
    const broadcaster = new TopicBroadcaster(['tm_pollr'], {
        networkPreset: location.hostname === 'localhost' ? 'local' : network
    })
    const broadcasterResult = await broadcaster.broadcast(tx)
      console.log('broadcasterResult:', broadcasterResult)
      if (broadcasterResult.status === 'error') {
        throw new Error('Transaction failed to broadcast')
      }
    return "parsedResponse"
}
export async function submitVote({
    pollId,
    index, }: {
        pollId: string,
        index: string,
    }):
    Promise<string> {
    const walletClient = new WalletClient()
    const walID = await walletClient.getPublicKey({
        identityKey: true
    })

    const PD = new PushDrop(walletClient)
    const fields = [
        Buffer.from("vote", "utf8"),
        Buffer.from('' + walID.publicKey, "utf8"),
        Buffer.from('' + pollId, "utf8"),
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
        [0, 'testvote'],
        '1',
        walID.publicKey
    )

    const newPollToken = await walletClient.createAction({
        outputs: [{
            lockingScript: OutputScript.toHex(),
            satoshis: 1,
            basket: 'poll tokens',
            outputDescription: 'New Poll'
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
    const network = (await walletClient.getNetwork()).network
    const broadcaster = new TopicBroadcaster(['tm_pollr'], {
        networkPreset: location.hostname === 'localhost' ? 'local' : network
    })
    const broadcasterResult = await broadcaster.broadcast(tx)
    console.log('broadcasterResult:', broadcasterResult)
    if (broadcasterResult.status === 'error') {
        throw new Error('Transaction failed to broadcast')
    }
    return "parsedResponse"
}

export async function closePoll({
    pollId }: {
        pollId: string,
    }): Promise<string> {
    const walletClient = new WalletClient()
    let query = {} as PollQuery
    query.txid = pollId
    query.type = 'allvotesfor'
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'

    const network = (await walletClient.getNetwork()).network
    const resolver = new LookupResolver({ networkPreset: location.hostname === 'localhost' ? 'local' : network})
    const lookupResult = await resolver.query(question)

    if (lookupResult.type !== 'output-list') {
        throw new Error('Lookup result type must be output-list')
    }

    let votes: string[][] = []
    for (const output of lookupResult.outputs) {
        const parsedTransaction = Transaction.fromBEEF(output.beef)
        const decoded = await PushDrop.decode(parsedTransaction.outputs[output.outputIndex].lockingScript)

        const reader = new Utils.Reader(decoded.fields[0])
        const decodedFields = []
        while (!reader.eof()) {
            const fieldLength = reader.readVarIntNum()
            const fieldBytes = reader.read(fieldLength)
            decodedFields.push(Utils.toUTF8(fieldBytes))
        }
        console.log(JSON.stringify(decodedFields))
        votes.push(decodedFields)
    }
    const voteCounts: Record<string, number> = {} as Record<string, number>
    const voteOptions = await getPollOptions(pollId)
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

    const writer = new Utils.Writer()

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
    const lockingScript = await new PushDrop(walletClient).lock(
        [data],
        [0, 'testclose'],
        '1',
        'self'
        )
    let opentoken = await getPoll(pollId)
    const beefer = new Beef()
    const inputs: CreateActionInput[] = []
        inputs.push({
            outpoint: opentoken.id('hex') + '.0',
            unlockingScriptLength: 74,
            inputDescription: 'voteToken'
          })
        for (const vote of lookupResult.outputs) {
            let beef = Transaction.fromBEEF(vote.beef)
          inputs.push({
            outpoint: beef.id('hex') + ".0",
            unlockingScriptLength: 74,
            inputDescription: 'voteToken'
          })
            beefer.mergeBeef(vote.beef)
        }

     const { signableTransaction } = await walletClient.createAction({
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
    const broadcaster = new TopicBroadcaster(['tm_pollr'], {
        networkPreset: location.hostname === 'localhost' ? 'local' : network
    })
    await broadcaster.broadcast(tx)
    return 'pollresutls'
}
export async function fetchAllOpenPolls(): Promise<Poll[]> {
    let query = {} as PollQuery
    query.type = 'allpolls'
    query.status = "open"
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    const walletClient = new WalletClient()
    const { network } = await walletClient.getNetwork()
    const resolver = new LookupResolver({ networkPreset: location.hostname === 'localhost' ? 'local' : network})
    const lookupResult = await resolver.query(question)

    if (lookupResult.type !== 'output-list') {
        throw new Error('Must be of type output list')
    }

    const PD = new PushDrop(walletClient)
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
        console.log(JSON.stringify(decodedFields))
        pollsData.push(decodedFields)

    }
    const polls: Poll[] = pollsData.map((row: string[]) => ({
        key: row[1],
        avatarUrl: row[7],
        id: row.pop()!.toString(),
        name: row[2],
        desc: row[3],
        date: row[6],
        status: row[0]
    }));
    return polls
}

export async function fetchOpenVotes(pollId: string): Promise<Record<string, number>[]> {
    let query = {} as PollQuery
    query.type = 'allvotesfor'
    query.status = 'open'

    query.txid = pollId
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    const walletClient = new WalletClient()

    const network = (await walletClient.getNetwork()).network
    const resolver = new LookupResolver({ networkPreset: location.hostname === 'localhost' ? 'local' : network})
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
        console.log(JSON.stringify(decodedFields))
        votes.push(decodedFields)
    }
    const voteCounts: Record<string, number> = {} as Record<string, number>
    const voteOptions = await getPollOptions(pollId)
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

export async function fetchMypolls() {
    const walletClient = new WalletClient()
    let formattedPoll: {}[] = []
    try {
        const walID = await walletClient.getPublicKey({
            identityKey: true
        })
        const pollFromBasket = await walletClient.listOutputs({
            basket: 'test',
            include: 'entire transactions'
        })
        console.log(`BEEF: ${JSON.stringify(pollFromBasket)}`)
        const asciiStr = Buffer.from(pollFromBasket.BEEF!).toString('ascii');
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
                // return decodedFields
            }
            catch (e) {
                console.log(`error decoding polls ${e}`)
            }
        }))
        for (let i = 0; i < localpolls.length; i++) {
            const poll = localpolls[i]
            let id = poll.pop()!
            formattedPoll.push({
                key: i.toString(),
                avatarUrl: getAvatar(walID.publicKey),
                id: id,
                name: poll[2],
                desc: poll[3],
                date: poll[6],
            })
            // console.log(parsedResponse.result.polls)
        }
    }
    catch (e) {
        console.log(`error finding basket polls:${e}`)
    }
    return formattedPoll

}
export async function getClosedPolls() {
    let query = {} as PollQuery
    query.type = 'poll'
    query.status = "closed"
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    const walletClient = new WalletClient()

    const network = (await walletClient.getNetwork()).network
    const resolver = new LookupResolver({ networkPreset: location.hostname === 'localhost' ? 'local' : network})
    const lookupResult = await resolver.query(question)

    if (lookupResult.type !== 'output-list') {
        throw new Error('Lookup result type must be output-list')
    }

    const PD = new PushDrop(walletClient)
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
        console.log(JSON.stringify(decodedFields))
        pollsData.push(decodedFields)
    }
    const polls: Poll[] = pollsData.map((row: string[]) => ({
        key: row[1],
        avatarUrl: row[7],
        id: row.pop()!.toString(),
        name: row[2],
        desc: row[3],
        date: row[6],
        status: row[0]
    }));
    return polls
}
export async function getPollOptions(pollId: string): Promise<string[]> {
    let walletClient = new WalletClient()
    let query = {} as PollQuery
    query.type = 'poll'
    query.status = 'open'
    query.txid = pollId
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    const network = (await walletClient.getNetwork()).network
    const resolver = new LookupResolver({ networkPreset: location.hostname === 'localhost' ? 'local' : network})
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
    console.log(JSON.stringify(decodedFields.slice(7)))

    return decodedFields.slice(7)
}
export async function getPoll(pollId: string): Promise<Transaction> {
    let walletClient = new WalletClient()
    let query = {} as PollQuery
    query.type = 'poll'
    query.status = 'open'
    query.txid = pollId
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    const network = (await walletClient.getNetwork()).network
    const resolver = new LookupResolver({ networkPreset: location.hostname === 'localhost' ? 'local' : network})
    const lookupResult = await resolver.query(question)
    if (lookupResult.type !== 'output-list') {
        throw new Error('Lookup result type must be output-list')
    }

    return Transaction.fromBEEF(lookupResult.outputs[0].beef)
}
export async function getAvatar(identityKey: string): Promise<string> {
    let avatarUrl: string = ''
    let walletClient = new WalletClient()
    try {
        const identityClient = new IdentityClient(walletClient)
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
