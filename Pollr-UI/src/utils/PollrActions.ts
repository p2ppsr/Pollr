import { createAction, EnvelopeEvidenceApi, toBEEFfromEnvelope } from '@babbage/sdk-ts'
// import { toEnvelopeFromBEEF } from '@babbage/sdk-ts/dist/toEnvelopeFromBEEF';
// import { toEnvelopeFromBEEF } from '@babbage/sdk-ts'
import pushdrop from 'pushdrop'
import { getPublicKey, createSignature } from "@babbage/sdk-ts"
import { Option, PollQuery } from '../types/types'
import { LookupQuestion } from '@bsv/overlay'
import { Output } from '@mui/icons-material'
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
            basket: "mypollstest1",
        }],
        description: 'Create poll test'
    })

    const beef = toBEEFfromEnvelope({
        rawTx: newToken.rawTx! as string,
        inputs: newToken.inputs! as Record<string, EnvelopeEvidenceApi>,
        txid: newToken.txid
    }).beef

    const response = await fetch(`http://localhost:8080/submit`, {
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
    const signage = createSignature({
        data: tosign.toString(),
        protocolID: "votesigntest1",
        keyID: "1test",
        description: "Allows topic manager to confirm votes test",
        counterparty: "self",
    })
    const OutputScript = pushdrop.create({
        fields: tosign,
        protocolID: "votetest1",
        keyID: "1test",
    })


    const newToken = await createAction({
        outputs: [{
            satoshis: 1,
            script: OutputScript,
            customInstructions: '' + signage,
        }],
        description: 'vote poll test'
    })

    const beef = toBEEFfromEnvelope({
        rawTx: newToken.rawTx! as string,
        inputs: newToken.inputs! as Record<string, EnvelopeEvidenceApi>,
        txid: newToken.txid
    }).beef

    const response = await fetch(`http://localhost:8090//vote`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['tm_pollr'])
        },
        body: new Uint8Array(beef)
    })
    const parsedResponse = await response.json()

    console.log(parsedResponse)
    return parsedResponse
}

export async function closePoll({
    pollId, results, options }: {
        pollId: string,
        results: number[],
        options: string[]
    }): Promise<string> {

    // const formattedBuffers: Buffer[] = options.map((option, index) => {
    //     const result = results[index] ?? ""; // Handle potential undefined results
    //     const formattedString = `${option} : ${result}`;
    //     return Buffer.from(formattedString, "utf8");
    // });
    
    const walID = await getPublicKey({
        identityKey: true
    })
    /////////////////////////////// missing step is to spend all tokens related to this poll.
    const OutputScript = pushdrop.create({
        fields: [
            Buffer.from("close", "utf8"),
            Buffer.from('' + walID, "utf8"),
            Buffer.from('' + pollId, "utf8"),
            ...options.map((opt, i) => Buffer.from(`${opt}:${results[i]}`, "utf8")) 
        ],
        protocolID: "pollclosetest1",
        keyID: "3test",
    })
    const newToken = await createAction({
        outputs: [{
            satoshis: 1,
            script: OutputScript,
        }],
        description: 'Close poll test'
    })

    const beef = toBEEFfromEnvelope({
        rawTx: newToken.rawTx! as string,
        inputs: newToken.inputs! as Record<string, EnvelopeEvidenceApi>,
        txid: newToken.txid
    }).beef

    const response = await fetch(`http:/localhost:8090/close`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['tm_pollr'])
        },
        body: new Uint8Array(beef)
    })
    const parsedResponse = await response.json()

    console.log(parsedResponse)
    return parsedResponse
}
export async function fetchAllpolls():Promise<string>
{
    let query = {} as PollQuery 
    query.type = 'poll'
    query.status = "all"
    let question = {} as LookupQuestion
    question.query = query
    question.service = 'ls_pollr'
    // console.log(question)
    const response = await fetch(`http://localhost:8080/lookup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Topics': JSON.stringify(['ls_pollr'])
        },
        body:  JSON.stringify(question)
    })
    // console.log(response)

    const parsedResponse = await response.json()
    // toEnvelopeFromBEEF(parsedResponse.outputs[0].beef);
    // const buffer = Buffer.from(parsedResponse.outputs[0].beef);
    // const hexString = buffer.toString('hex');
    console.log(parsedResponse)
    // console.log(parsedResponse.Outputs[0])
    const script = parsedResponse
    // console.log(script.lockingScript)
    let result = " "
    // const result = pushdrop.decode({
    //     script: script.lockingScript.toString('hex'),
    //     fieldFormat: 'buffer'
    // })
    console.log(script)
    return result
}