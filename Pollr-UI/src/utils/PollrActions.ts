import { createAction, EnvelopeEvidenceApi, toBEEFfromEnvelope, getTransactionOutputs } from '@babbage/sdk-ts'
// import { toEnvelopeFromBEEF } from '@babbage/sdk-ts/dist/toEnvelopeFromBEEF'
// import { toEnvelopeFromBEEF } from '@babbage/sdk-ts'
import pushdrop from 'pushdrop'
import { getPublicKey, createSignature } from "@babbage/sdk-ts"
import { Option, PollQuery, OptionResults, Poll,VoteData } from '../types/types'
import { LookupQuestion } from '@bsv/overlay'
import { FileDownloadOffRounded, VolumeMuteRounded } from '@mui/icons-material'
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

    const walID = await getPublicKey({
        identityKey: true
    })
    const OutputScript = await pushdrop.create({
        fields: [
            Buffer.from("open", "utf8"),
            Buffer.from('' + walID, "utf8"),
            Buffer.from('' + pollName, "utf8"),
            Buffer.from('' + pollDescription, "utf8"),
            Buffer.from('' + options.length.toString(), "utf8"),
            Buffer.from('' + optionsType, "utf8"),
            Buffer.from('' + (Math.floor(Date.now() / 1000)).toString(), "utf8"),
            ...options.map((opt) => Buffer.from(opt.value, "utf8"))
        ],
        protocolID: "plrct1",
        keyID: "0",
    })
    const newToken = await createAction({
        outputs: [{
            satoshis: 1,
            script: OutputScript,
            basket: "mypollstest2",
        }],
        description: 'Create poll test'
    })

    const beef = toBEEFfromEnvelope({
        rawTx: newToken.rawTx! as string,
        inputs: newToken.inputs! as Record<string, EnvelopeEvidenceApi>,
        txid: newToken.txid
    }).beef

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
    return parsedResponse
}
export async function submitVote({
    pollId,
    index, }: {
        pollId: string,
        index: string,
    }):
    Promise<string> {
    const walID = await getPublicKey({
        identityKey: true
    })
    let tosign = [
        Buffer.from("vote", "utf8"),
        Buffer.from('' + walID, "utf8"),
        Buffer.from('' + pollId, "utf8"),
        Buffer.from('' + index, "utf8"),
    ]
    const signage = await createSignature({
        data: tosign.toString(),
        protocolID: "votesigntest1",
        keyID: "1test",
        description: "Allows topic manager to confirm votes test",
        counterparty: "self",
    })
    const OutputScript = await pushdrop.create({
        fields: tosign,
        protocolID: "votetest1",
        keyID: "1test",
    })


    const newToken = await createAction({
        outputs: [{
            satoshis: 1,
            script: OutputScript,
            customInstructions: '' ,
        }],
        description: 'vote poll test'
    })

    const beef = await toBEEFfromEnvelope({
        rawTx: newToken.rawTx! as string,
        inputs: newToken.inputs! as Record<string, EnvelopeEvidenceApi>,
        txid: newToken.txid
    }).beef
    console.log(`sending server: ${beef}`)

    const response = await fetch(`${pollrHost}/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['tm_pollr'])
        },
        body: new Uint8Array(beef)
    })
    const parsedResponse = await response.json()

    console.log(`server response: ${parsedResponse}`)
    return parsedResponse
}

export async function closePoll({
    pollId}: {
        pollId: string,
    }): Promise<string> {

    // const formattedBuffers: Buffer[] = options.map((option, index) => {
    //     const result = results[index] ?? "" // Handle potential undefined results
    //     const formattedString = `${option} : ${result}`
    //     return Buffer.from(formattedString, "utf8")
    // })

    const walID = await getPublicKey({
        identityKey: true
    })
    /////////////////////////////// missing step is to spend all tokens related to this poll.
    // const OutputScript = pushdrop.create({
    //     fields: [
    //         Buffer.from("close", "utf8"),
    //         Buffer.from('' + walID, "utf8"),
    //         Buffer.from('' + pollId, "utf8"),
    //         ...options.map((opt, i) => Buffer.from(`${opt}:${results[i]}`, "utf8"))
    //     ],
    //     protocolID: "pollclosetest1",
    //     keyID: "3test",
    // })
    // const newToken = await createAction({
    //     outputs: [{
    //         satoshis: 1,
    //         script: OutputScript,
    //     }],
    //     description: 'Close poll test'
    // })

    // const beef = toBEEFfromEnvelope({
    //     rawTx: newToken.rawTx! as string,
    //     inputs: newToken.inputs! as Record<string, EnvelopeEvidenceApi>,
    //     txid: newToken.txid
    // }).beef

    // const response = await fetch(`${pollrHost}/submit`, {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/octet-stream',
    //         'X-Topics': JSON.stringify(['tm_pollr'])
    //     },
    //     body: new Uint8Array(beef)
    // })

    let query = {} as PollQuery
    query.type = 'poll'
    query.status = 'open'
    query.pollId = pollId
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    let response = await fetch(`${pollrHost}/lookup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['ls_pollr'])
        },
        body: JSON.stringify(question)
    })

    let parsedResponse = await response.json()
    console.log(`poll close request${JSON.stringify(parsedResponse)}`)

    query.type = 'vote'
    query.status = 'all'
    query.pollId = pollId
    question.query = query
    question.service = 'ls_pollr'
    response = await fetch(`${pollrHost}/lookup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['ls_pollr'])
        },
        body: JSON.stringify(question)
    })
    
    parsedResponse = await response.json()
    console.log(`vote close request${JSON.stringify(parsedResponse)}`)
    const votes: VoteData [] = parsedResponse.result.voteDetails
    votes.forEach((item: VoteData) => {
        const decodedData = pushdrop.decode({
            script:item.txid,
            fieldFormat: 'buffer'
        })
        // console.log(`${JSON.stringify(decodedData.fields[0])}`)
        console.log(`${decodedData.fields[0]}`)
        // Process each item as needed
      })
    return parsedResponse
}
export async function fetchAllpolls(): Promise<Poll[]> {
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
    const votesData = parsedResponse.result.votes

    for (let i = 0; i < pollsData.length; i++) {
        const poll = pollsData[i]
        let time = new Date(parseInt(poll.date, 10) * 1000)

        pollresutls.push({
            id: poll.pollId,
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
    query.pollId = pollId
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
    console.log(parsedResponse.result.votes[0])
    const votesData = parsedResponse.result.votes[0] as Record<string, number>

    const listOfRecords: Record<string, number>[] = (Object.entries(votesData) as [string, number][])
        .map(([option, count]) => ({ [option]: count }))
    return listOfRecords
}
export async function fetchMypolls() {

    let query = {} as PollQuery
    query.type = 'poll'
    query.status = "all"
    query.voterId = await getPublicKey({
        identityKey: true
    })
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    console.log(`sending ${JSON.stringify(question)}`)
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
    const votesData = parsedResponse.result.votes

    for (let i = 0; i < pollsData.length; i++) {
        const poll = pollsData[i]
        let time = new Date(parseInt(poll.date, 10) * 1000)
        pollresutls.push({
            id: poll.pollId,
            name: poll.pollName,
            desc: poll.pollDescription,
            date: time.toLocaleDateString(),
            status: poll.status
        })
    }
    return pollresutls
}
export async function getClosedPolls() {
    let query = {} as PollQuery
    query.type = 'poll'
    query.status = "closed"
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
    const votesData = parsedResponse.result.votes

    for (let i = 0; i < pollsData.length; i++) {
        const poll = pollsData[i]
        let time = new Date(parseInt(poll.date, 10) * 1000)

        pollresutls.push({
            id: poll.pollId,
            name: poll.pollName,
            desc: poll.pollDescription,
            date: time.toLocaleDateString(),
        })
    }
    return pollresutls
}
export async function getPoll(pollId: string) {
    let query = {} as PollQuery
    query.type = 'poll'
    query.status = 'any1'
    query.pollId = pollId
    query.voterId = await getPublicKey({
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
    console.log(parsedResponse.result.polls[0].status)
    const votesData = parsedResponse.result.votes[0] as Record<string, number>
    const pollStatus = parsedResponse.result.polls[0].status

    const listOfRecords: Record<string, number>[] = (Object.entries(votesData) as [string, number][])
        .map(([option, count]) => ({ [option]: count }))
    return {listOfRecords,pollStatus }
}