import { AdmittanceInstructions, TopicManager } from '@bsv/overlay'
import { LookupQuestion, Transaction, PushDrop, Utils, LookupResolver } from '@bsv/sdk'
import { PollQuery } from '../types.js'

export default class PollrTopicManager implements TopicManager {
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
                    const decodedOutput = await PushDrop.decode(output.lockingScript)
                    let result
                    const reader = new Utils.Reader(decodedOutput.fields[0])
                    const decodedFields = []
                    while (!reader.eof()) {
                        const fieldLength = reader.readVarIntNum()
                        const fieldBytes = reader.read(fieldLength)
                        decodedFields.push(Utils.toUTF8(fieldBytes))
                    }
                    if (decodedFields[0] === "vote") {
                        if (Array.isArray(decodedFields) && decodedFields.length !== 4) {
                            throw new Error('Vote token did not meet criteria.')
                        }
                        let pollQuery: PollQuery = {} as PollQuery
                        pollQuery.txid = decodedFields[2].toString()
                        pollQuery.type = "poll"
                        pollQuery.status = "open"

                        let pollQuestion: LookupQuestion = {} as LookupQuestion
                        pollQuestion.query = pollQuery
                        pollQuestion.service = 'ls_pollr'
                        //check valid poll
                        const resolver = new LookupResolver({
                            networkPreset: 'local'
                        })
                        const pollLSResult = await resolver.query(pollQuestion)
                        if (pollLSResult.outputs.length !== 1) {
                            throw new Error("invalid poll")
                        }
                        let voteQuery: PollQuery = {} as PollQuery
                        voteQuery.txid = decodedFields[2].toString()
                        voteQuery.type = "vote"
                        voteQuery.voterId = decodedFields[1].toString()

                        let question: LookupQuestion = {} as LookupQuestion
                        question.query = voteQuery
                        question.service = 'ls_pollr'
                        //check dups
                        const lookupResult = await resolver.query(question)
                        if (lookupResult.type !== 'output-list') {
                            throw new Error('Bad lookup result')
                        }
                        if (!lookupResult || lookupResult.outputs.length > 0) {
                            throw new Error("dup vote.")
                        }
                    } else if (decodedFields[0] === "open") {
                        if (Array.isArray(decodedFields) && decodedFields.length !== 7 + Number(decodedFields[4])) {
                            throw new Error('Open oken did not meet criteria.')
                        }
                        // if (decodedFields[5] == "UHRP") {
                        //     const lookupResolver = new LookupResolver({ networkPreset: 'mainnet' })
                        //     for (let i = 0; i < Number(decodedFields[4]); i++) {
                        //         let uhrp = decodedFields[7 + i]
                        //         const lookupResult = await lookupResolver.query({
                        //             service: 'ls_uhrp',
                        //             query: { uhrpUrl: uhrp }
                        //         })
                        //         if (lookupResult.type !== 'output-list') {
                        //             throw new Error('Bad lookup result')
                        //         }
                        //         if (!lookupResult || lookupResult.outputs.length < 0) {
                        //             throw new Error("Invalid UHRP")
                        //         }
                        //     }
                        // }
                    } else if (decodedFields[0] === "close") {
                        if (Array.isArray(decodedFields) && decodedFields.length !== 7 + 2 * Number(decodedFields[4])) {
                            throw new Error('close Token did not meet criteria.')
                        }
                    } else {
                        console.log("tm Invalid transaction type!")
                    }
                    outputsToAdmit.push(i)
                } catch (err) {
                    console.error('Invalid output', err)
                }
            }

        } catch (err) {
            console.error('Error identifying admissible outputs:', err)
        }
        // console.log("TM LEAVING!")//debug purpose /will remove after tests
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
        return '# Pollr Topic Manager'
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
        return {
            name: 'Pollr Topic Manager',
            shortDescription: 'Manages pollr outputs'
        }
    }
}
