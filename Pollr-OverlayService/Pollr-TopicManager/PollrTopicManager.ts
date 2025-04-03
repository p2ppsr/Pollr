import { AdmittanceInstructions, TopicManager, LookupAnswer, LookupFormula } from '@bsv/overlay'
import { LookupQuestion, PublicKey, Transaction, Signature, PushDrop, ProtoWallet, Utils } from '@bsv/sdk'
// import { verifySignature } from "@babbage/sdk-ts"
import { PollrLookupService } from '../Pollr-LookupService/PollrLookupService.js'
import { PollQuery } from '../Pollr-LookupService/types.js'
// import pushdrop from 'pushdrop'
export class PollrTopicManager implements TopicManager {
    constructor(private lookupService: PollrLookupService) { }
    /**
     * Identify if the outputs are admissible depending on the particular protocol requirements
     * @param beef - The transaction data in BEEF format
     * @param previousCoins - The previous coins to consider
     * @returns A promise that resolves with the admittance instructions
     */
    async identifyAdmissibleOutputs(beef: number[], previousCoins: number[]): Promise<AdmittanceInstructions> {
        const outputsToAdmit: number[] = []
        try {
            const parsedTransaction = Transaction.fromBEEF(beef)
            for (const [i, output] of parsedTransaction.outputs.entries()) {
                try {
                    console.log("attemping to decode")
                    const decodedOutput = await PushDrop.decode(output.lockingScript)
                    console.log(JSON.stringify(decodedOutput))
                    console.log("attemping to remove last field")

                    // const signature = decodedOutput.fields.pop() as number[]
                    //////////////////////////////////
                    let result
                    const reader = new Utils.Reader(decodedOutput.fields[0])
                    const decodedFields = []
                    while (!reader.eof()) {
                        const fieldLength = reader.readVarIntNum()
                        const fieldBytes = reader.read(fieldLength)
                        decodedFields.push(Utils.toUTF8(fieldBytes))
                    }
                    console.log(decodedFields)
                    console.log(`ff: ${JSON.stringify(decodedFields)}`)
                    if (decodedFields[0] === "vote") {
                        // console.log(`checking amount of fields. `)
                        if (Array.isArray(decodedFields) && decodedFields.length !== 4) {
                            throw new Error('Token did not meet criteria.')
                        }
                        let pollQuery: PollQuery = {} as PollQuery
                        pollQuery.txid = decodedFields[2].toString()
                        pollQuery.type = "poll"
                        pollQuery.status = "open"
                        let pollQuestion: LookupQuestion = {} as LookupQuestion
                        pollQuestion.query = pollQuery
                        pollQuestion.service = 'ls_pollr'
                        //check valid poll
                        const pollLSResult = await this.lookupService.lookup(pollQuestion)
                        if ("type" in pollLSResult) {
                            if (pollLSResult.type === "freeform") {
                                let poll = pollLSResult.result as { polls: any[], pollvotes: any[] }
                                if (poll.polls.length != 1) {
                                    throw new Error("invalid poll")
                                }
                            }
                        }
                        let voteQuery: PollQuery = {} as PollQuery
                        voteQuery.txid = decodedFields[2].toString()
                        voteQuery.type = "vote"
                        voteQuery.voterId = decodedFields[1].toString()
                        let question: LookupQuestion = {} as LookupQuestion
                        question.query = voteQuery
                        question.service = 'ls_pollr'
                        //check dups
                        const lookupResult = await this.lookupService.lookup(question)
                        if ("type" in lookupResult) {
                            if (lookupResult.type === "freeform") {
                                let vote = lookupResult.result as { voteDetails: string }
                                if (vote.voteDetails !== null) {
                                    throw new Error("dup vote.")
                                }
                            }
                        }
                        // //check valid signiture
                        // const data = decodedOutput.fields.reduce((a, e) => [...a, ...e], [])
                        // const anyoneWallet = new ProtoWallet('anyone')
                        // const { valid: hasValidSignature } = await anyoneWallet.verifySignature({
                        //     data,
                        //     signature,
                        //     counterparty: decodedFields[1].toString(),
                        //     protocolID: [1, 'votesign'],
                        //     keyID: '1'
                        // })
                        // if (!hasValidSignature) throw new Error('Invalid signature!')

                        // if (!hasValidSignature) {
                        //     console.log('tm vote sign issue\n%O', result)
                        //     throw new Error('Invalid signature!')
                        // }
                        // console.log('tm vote added successfully to the database:\n%O', result)

                    } else if (decodedFields[0] === "open") {
                        console.log("tm Processing a poll opening...")
                        console.log(`there are ${7 + Number(decodedFields[4])} inputs`)
                        console.log(`there are ${decodedFields.length} inputs`)
                        if (Array.isArray(decodedFields) && decodedFields.length !== 7 + Number(decodedFields[4])) {
                            throw new Error('Open oken did not meet criteria.')
                        }
                        console.log('tm poll added successfully to the database:\n%O', result)

                    } else if (decodedFields[0] === "close") {
                        console.log("tm Processing a close...")
                        if (Array.isArray(decodedFields) && decodedFields.length !== 4) {
                            throw new Error('close Token did not meet criteria.')
                        }
                        console.log("tm Poll successfully closed...")

                    } else {
                        console.log("tm Invalid transaction type!")
                    }
                    outputsToAdmit.push(i)
                } catch (err) {
                    console.error('Invalid output', err)
                }
            }

        } catch (err) {
            // console.error('Error identifying admissible outputs:', err)
        }
        console.log("TM LEAVING!")//debug purpose /will remove after tests
        return {
            outputsToAdmit,
            coinsToRetain: []
        }
    }


    /**
     * Get the documentation associated with this topic manager
     * @returns A promise that resolves to a string containing the documentation
     */
    async getDocumentation(): Promise<string> {
        throw new Error('Method not implemented.')
    }

    /**
     * Get metadata about the topic manager
     * @returns A promise that resolves to an object containing metadata
     * @throws An error indicating the method is not implemented
     */
    async getMetaData(): Promise<{
        name: string
        shortDescription: string
        iconURL?: string
        version?: string
        informationURL?: string
    }> {
        throw new Error('Method not implemented.')
    }

}