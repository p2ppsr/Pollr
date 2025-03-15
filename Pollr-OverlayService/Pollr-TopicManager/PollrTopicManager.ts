import { AdmittanceInstructions, TopicManager, LookupAnswer, LookupFormula } from '@bsv/overlay'
import { LookupQuestion, PublicKey, Transaction } from '@bsv/sdk'
import { verifySignature } from "@babbage/sdk-ts"
import { PollrLookupService } from '../Pollr-LookupService/PollrLookupService.js'
import { PollQuery } from '../Pollr-LookupService/types.js'
import pushdrop from 'pushdrop'
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
                    const decodedOutput = pushdrop.decode({
                        script: output.lockingScript.toHex(),
                        fieldFormat: 'buffer'
                    })
                    let result
                    const firstField = decodedOutput.fields[0].toString("utf8")
                    if (firstField === "vote") {
                        console.log("tm Processing a vote...")
                        //check that it has 4 items
                        if (decodedOutput.fields.length() !== 4) {
                            throw new Error('Token did not meet criteria.')
                        }

                        //check valid poll
                        let query: PollQuery = {} as PollQuery
                        query.pollId = decodedOutput.fields[3]
                        let question: LookupQuestion = {} as LookupQuestion
                        question.query = query
                        question.service = 'ls_pollr'
                        const lookupResult = await this.lookupService.lookup(question)
                        if (
                            lookupResult && (
                                (Array.isArray(lookupResult) && lookupResult.length > 0) ||
                                (!Array.isArray(lookupResult) && Object.keys(lookupResult).length > 0)
                            )
                        ) {
                            throw new Error("poll not found.")
                        }
                        //check dups

                        // if (
                        //   Array.isArray(lookupResult) &&
                        //   lookupResult.some(vote => vote.voterId === decodedOutput.fields[2])
                        // ) {
                        //   throw new Error("User has already voted in this poll.")
                        // }
                        //check that it has valid wallet id, pollid, index(params)
                        //check signature

                        const pubKey = PublicKey.fromString(decodedOutput.lockingPublicKey)
                        let toverify =
                            [
                                decodedOutput.fields[0],
                                decodedOutput.fields[1],
                                decodedOutput.fields[2],
                                decodedOutput.fields[3],
                            ]

                        const hasValidSignature = verifySignature({
                            data: decodedOutput.tostring(),
                            signature: toverify.toString(),
                            protocolID: "votesigntest1",
                            keyID: "1test",
                            description: "To confirm Identiy of voter",
                            counterparty: decodedOutput.lockingPublicKey.tostring(),
                        })
                        if (!hasValidSignature) throw new Error('Invalid signature!')
                        console.log('tm vote added successfully to the database:\n%O', result)

                    } else if (firstField === "open") {
                        console.log("tm Processing a poll opening...")

                        console.log('tm poll added successfully to the database:\n%O', result)

                    } else if (firstField === "close") {
                        console.log("tm Processing a close...")

                        console.log("tm Poll successfully closed...")

                    } else {
                        console.log("tm Invalid transaction type!")
                    }


                    outputsToAdmit.push(i)
                } catch (err) {
                    // console.error('Invalid output', err)

                }

            }

        } catch (err) {
            console.error('Error identifying admissible outputs:', err)
        }
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
