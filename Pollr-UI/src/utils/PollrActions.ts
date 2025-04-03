// import { createAction, EnvelopeEvidenceApi, toBEEFfromEnvelope, getTransactionOutputs } from '@babbage/sdk-ts'
// import { toEnvelopeFromBEEF } from '@babbage/sdk-ts/dist/toEnvelopeFromBEEF'
// import { toEnvelopeFromBEEF } from '@babbage/sdk-ts'
// import pushdrop from 'pushdrop'
import { WalletClient, PushDrop, Utils, Transaction, ProtoWallet, type WalletOutput, DiscoverCertificatesResult, CreateActionInput, IdentityClient } from '@bsv/sdk'
// import { getPublicKey, createSignature } from "@babbage/sdk-ts"
import { Option, PollQuery, OptionResults, Poll } from '../types/types'
import { LookupQuestion } from '@bsv/overlay'
import { FileDownloadOffRounded, LocalPoliceOutlined, VolumeMuteRounded } from '@mui/icons-material'
import { parse } from 'path'
import { avatarGroupClasses } from '@mui/material'
const pollrHost = 'http://localhost:8080'
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
    const WC = new WalletClient()
    const walID = await WC.getPublicKey({
        identityKey: true
    })

    const PD = new PushDrop(WC)
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

    const newPollToken = await WC.createAction({
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
    const response = await fetch(`${pollrHost}/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['tm_pollr'])
        },
        body: new Uint8Array(beef)
    })
    const parsedResponse = await response.json()
    console.log(`response: ${parsedResponse}`)
    return "parsedResponse"
}
export async function submitVote({
    pollId,
    index, }: {
        pollId: string,
        index: string,
    }):
    Promise<string> {
    const WC = new WalletClient()
    const walID = await WC.getPublicKey({
        identityKey: true
    })

    const PD = new PushDrop(WC)
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

    const newPollToken = await WC.createAction({
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
    // const anyoneWallet = new ProtoWallet('anyone')
    // await anyoneWallet.createSignature({
    //     data: ,
    //     counterparty: "anyone",
    //     protocolID: [1, 'identity'],
    //     keyID: '1'
    // })
    //  await WC.createSignature({
    //     data: flattenedArray,
    //     counterparty: "self",
    //     protocolID: [1, 'votesign'],
    //     keyID: '1'
    // })
    const tx = Transaction.fromAtomicBEEF(newPollToken.tx!)
    if (!tx) {
        throw new Error("Transaction creation failed: tx is undefined")
    }
    const beef = Transaction.fromAtomicBEEF(newPollToken.tx!).toBEEF()

    console.log(`sending ${beef}`)
    const response = await fetch(`${pollrHost}/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['tm_pollr'])
        },
        body: new Uint8Array(beef)
    })
    const parsedResponse = await response.json()
    console.log(`response: ${parsedResponse}`)
    return "parsedResponse"
}
export async function closePoll({
    pollId }: {
        pollId: string,
    }): Promise<string> {
    const WC = new WalletClient()
    let query = {} as PollQuery
    query.txid = pollId
    query.type = 'vote'
    query.status = "all"
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    const response = await fetch(`${pollrHost}/lookup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['ls_pollr'])
        },
        body: JSON.stringify(question)
    })
    const parsedResponse = await response.json()
    const inputs: CreateActionInput[] = []
    //create locking script for 
    const pushdrop = new PushDrop(WC)
    const results = (await getPoll(pollId.toString())).results
    const resultsWriter = new Utils.Writer();

    resultsWriter.writeVarIntNum(results.length);

    for (const result of results) {
        // Convert the object to a JSON string.
        const jsonString = JSON.stringify(result);
        // Convert the JSON string to a Buffer.
        const jsonBuffer = Buffer.from(jsonString, "utf8");
        // Write the length of the JSON string (in bytes).
        resultsWriter.writeVarIntNum(jsonBuffer.length);
        // Write the actual bytes (convert Buffer to a plain number array).
        resultsWriter.write(Array.from(jsonBuffer));
    }

    // Get the encoded payload as a flattened numeric array.
    const resultsField = resultsWriter.toArray();
    const lockingScript = await pushdrop.lock(
        [resultsField],
        [1, 'pollClose'],
        '1',
        'self'
    )
    if (parsedResponse.result.voteDetails.length != 0) {
        for (let i = 0; i < parsedResponse.result.voteDetails.length; i++) {
            inputs.push({
                outpoint: parsedResponse.result.voteDetails[i].txid,
                unlockingScriptLength: 74,
                inputDescription: 'votes token'
            })
        }
        // Transaction.fromBEEF(parsedResponse.result.voteDetails.txid)
        const { signableTransaction } = await WC.createAction({
            description: `Closing ${pollId} and redeeming all its votes`,
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
    }
    console.log(parsedResponse)

    return 'pollresutls'
}
export async function fetchAllOpenPolls(): Promise<Poll[]> {
    let query = {} as PollQuery
    query.type = 'poll'
    query.status = "all"
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    const response = await fetch(`${pollrHost}/lookup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['ls_pollr'])
        },
        body: JSON.stringify(question)
    })
    const parsedResponse = await response.json()
    let pollresutls: Poll[] = []
    console.log(parsedResponse)
    const pollsData = parsedResponse.result.polls

    for (let i = 0; i < pollsData.length; i++) {
        const poll = pollsData[i]
        let time = new Date(parseInt(poll.date, 10) * 1000)
        pollresutls.push({
            key: i.toString(),
            avatarUrl: await getAvatar(poll.walID!),
            id: poll.txid,
            name: poll.pollName,
            desc: poll.pollDescription,
            date: time.toLocaleDateString(),
        })
        // console.log(parsedResponse.result.polls)
    }
    return pollresutls
}
export async function fetchopenvotes(pollId: string): Promise<Record<string, number>[]> {
    let query = {} as PollQuery
    query.type = 'poll'
    query.status = 'open'
    console.log(`asking for pid: ${pollId}`)

    query.txid = pollId
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    console.log(`asking for: ${query.txid}`)
    const response = await fetch(`${pollrHost}/lookup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['ls_pollr'])
        },
        body: JSON.stringify(question)
    })

    const parsedResponse = await response.json()
    console.log(parsedResponse.result.votes[0])
    const votesData = parsedResponse.result.votes[0] as Record<string, number>

    const listOfRecords: Record<string, number>[] = (Object.entries(votesData) as [string, number][])
        .map(([option, count]) => ({ [option]: count }))
    return listOfRecords
}
export async function fetchMypolls() {
    const WC = new WalletClient()
    let formattedPoll: {}[] = []
    try {
        const walID = await WC.getPublicKey({
            identityKey: true
        })
        const pollFromBasket = await WC.listOutputs({
            basket: 'test',
            include: 'entire transactions'
        })
        let localpolls: string[][] = []
        const polls = await Promise.all(pollFromBasket.outputs.map(async (task: WalletOutput, i: number) => {
            try {
                const tx = Transaction.fromBEEF(pollFromBasket.BEEF as number[], task.outpoint.split('.')[0])
                console.log(`tx: ${JSON.stringify(tx)}`)
                const lockingScript = tx!.outputs[0].lockingScript
                const decodedOutput = await PushDrop.decode(lockingScript)
                console.log(`${JSON.stringify(decodedOutput)}`)
                const reader = new Utils.Reader(decodedOutput.fields[0])
                const decodedFields = []
                while (!reader.eof()) {
                    const fieldLength = reader.readVarIntNum()
                    const fieldBytes = reader.read(fieldLength)
                    decodedFields.push(Utils.toUTF8(fieldBytes))
                }
                console.log(`txids: ${pollFromBasket.outputs[i].outpoint.split('.')[0]}`)
                decodedFields.push(pollFromBasket.outputs[i].outpoint.split('.')[0])
                console.log(decodedFields)
                localpolls.push(decodedFields)
                // return decodedFields
            }
            catch (e) {
                console.log(`error decoding polls ${e}`)
            }
        }))
        console.log(localpolls)
        for (let i = 0; i < localpolls.length; i++) {
            const poll = localpolls[i]
            let time = new Date(parseInt(poll[6], 10) * 1000)
            let id = poll.pop()!
            formattedPoll.push({
                key: i.toString(),
                avatarUrl: getAvatar(walID.publicKey),
                id: id,
                name: poll[2],
                desc: poll[3],
                date: time.toLocaleDateString(),
            })
            // console.log(parsedResponse.result.polls)
        }
    }
    catch (e) {
        console.log(`error finding basket polls:${e}`)
    }
    return formattedPoll

}
// export async function getClosedPolls() {
//     let query = {} as PollQuery
//     query.type = 'poll'
//     query.status = "closed"
//     let question = {} as LookupQuestion
//     question.query = query
//     question.service = 'ls_pollr'
//     const response = await fetch(`${pollrHost}/lookup`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/octet-stream',
//             'X-Topics': JSON.stringify(['ls_pollr'])
//         },
//         body: JSON.stringify(question)
//     })

//     const parsedResponse = await response.json()
//     let pollresutls: Poll[] = []
//     console.log(parsedResponse)
//     const pollsData = parsedResponse.result.polls
//     const votesData = parsedResponse.result.votes

//     for (let i = 0 i < pollsData.length i++) {
//         const poll = pollsData[i]
//         let time = new Date(parseInt(poll.date, 10) * 1000)

//         pollresutls.push({
//             id: poll.pollId,
//             name: poll.pollName,
//             desc: poll.pollDescription,
//             date: time.toLocaleDateString(),
//         })
//     }
//     return pollresutls
// }
export async function getPoll(pollId: string): Promise<{ results: Record<string, number>[], pollStatus: string }> {
    let WC = new WalletClient()
    let query = {} as PollQuery
    query.type = 'poll'
    query.status = 'any1'
    query.txid = pollId

    const walID = await WC.getPublicKey({
        identityKey: true
    })
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    const response = await fetch(`${pollrHost}/lookup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['ls_pollr'])
        },
        body: JSON.stringify(question)
    })

    const parsedResponse = await response.json()

    console.log(`${JSON.stringify(parsedResponse.result)}`)
    console.log(parsedResponse.result.polls[0].status)
    const votesData = parsedResponse.result.votes[0] as Record<string, number>
    const pollStatus = parsedResponse.result.polls[0].status

    const results: Record<string, number>[] = (Object.entries(votesData) as [string, number][])
        .map(([option, count]) => ({ [option]: count }))
    return { results, pollStatus }
}
export async function getAvatar(identityKey: string): Promise<string> {
    let avatarUrl: string = ''
    console.log(`looking for ${identityKey}`)
    try {
        const identityClient = new IdentityClient()
        const identities = await identityClient.resolveByIdentityKey({
            identityKey: identityKey
        })
        if (identities.length > 0) {
            // console.log(`${JSON.stringify(identities)}`)
            avatarUrl = identities[0]?.avatarURL
        }
    } catch (error) {
        console.error('Error fetching identity:', error)
    }
    return avatarUrl
}