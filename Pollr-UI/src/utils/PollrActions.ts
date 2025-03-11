import { createAction, EnvelopeEvidenceApi, toBEEFfromEnvelope } from '@babbage/sdk-ts'
import pushdrop from 'pushdrop'
import { getPublicKey, createSignature, verifySignature } from "@babbage/sdk-ts"
export async function submitCreatePolls({
    pollName,
    pollDescription,
    optionsType,
    options, }: {
        pollName: string,
        pollDescription: string,
        optionsType: string,
        options: string[]
    }):
    Promise<string> {

    const walID = await getPublicKey({
        identityKey: true
    })
    const OutputScript = pushdrop.create({
        fields: [
            Buffer.from("open", "utf8"),
            Buffer.from('' + walID, "utf8"),
            Buffer.from('' + pollName, "utf8"),
            Buffer.from('' + pollDescription, "utf8"),
            Buffer.from('' + options.length.toString(), "utf8"),
            Buffer.from('' + optionsType, "utf8"),
            Buffer.from('' + (Math.floor(Date.now() / 1000)).toString(), "utf8"),
            ...options.map((opt) => Buffer.from(opt, "utf8")),
        ],
        protocolID: "pollcreationtest1",
        keyID: "0test",
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

    const response = await fetch(`http://localhost:8090//submit`, {
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

    const OutputScript = pushdrop.create({
        fields: [
            Buffer.from("vote", "utf8"),
            Buffer.from('' + walID, "utf8"),
            Buffer.from('' + pollId, "utf8"),
            Buffer.from('' + index, "utf8"),
        ],
        protocolID: "votetest1",
        keyID: "1test",
    })

    const signage = createSignature({
        data: OutputScript,
        protocolID: "votesigntest1",
        keyID: "1test",
        description: "Allows topic manager to confirm votes test",
        counterparty: "self",
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