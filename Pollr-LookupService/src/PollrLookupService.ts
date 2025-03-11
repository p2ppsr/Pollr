// import { LookupService } from './LookupService.js'
// import { LookupQuestion } from './LookupQuestion.js'
// import { LookupFormula } from './LookupFormula.js'
// import { LookupAnswer } from './LookupAnswer.js'
import { LookupService, LookupQuestion, LookupAnswer, LookupFormula } from '@bsv/overlay'
import { Script } from '@bsv/sdk'
import { MongoClient, Collection } from 'mongodb'
import pushdrop from 'pushdrop'

export type PollrStorage = {
    db_string: string
}
export class PollrLookupService implements LookupService {
    constructor(private storage: PollrStorage) { }
    private collection: Collection | undefined
    /**
     * Processes the event when a new UTXO is added to a voting topic.
     * This keeps track of open polls and votes.
     */
    async connectToDB(): Promise<void> {
        const client = new MongoClient(this.storage.db_string)

        try {
            const connection = await client.connect()
            console.log('Database connection established successfully.')
            this.collection = connection.db('appdb').collection('lookup_service')
        } catch (error) {
            console.error('Failed to connect to the database:\n%O', error)
            throw new Error('Database connection error.')
        }
    }

    async onTopic(topic) {
        if (topic !== 'tm_pollr') {
            throw new Error(`Invalid topic "${topic}" for this service.`)
        }
        return true
    }
    async outputAdded(
        txid: string,
        outputIndex: number,
        outputScript: Script,
        topic: string):
        Promise<void> {
        // const scriptText = outputScript.toString()
        console.log(
            `Processing new output addition:\nTXID: ${txid}\nOutput Index: ${outputIndex}\nTopic: ${topic}\nOutput Script: %O`,
            outputScript
        )
        this.onTopic(topic)
        try {
            const decodedOutput = pushdrop.decode({
                script: outputScript.toHex(),
                fieldFormat: 'buffer',
            })
            console.log('Decoded Output:\n%O', decodedOutput)
            //////////////////////////////////////////////
            const firstField = decodedOutput.fields[0].toString("utf8")
            if (firstField === "vote") {
                console.log("Processing a vote...");
               
            } else if (firstField === "open") {

                console.log("Processing a poll opening...");
               
            } else if (firstField === "close") {
                console.log("Processing a poll closing...");
            
            } else {
                console.log("Invalid transaction type!");
            }

            ////////////////////////////////////////////////////
            // console.log('Output added successfully to the database:\n%O', result)
        }
        catch (error) {
            console.error(`Failed to process and store the output for TXID ${txid} at index ${outputIndex}:\n%O`, error)
            throw new Error('Output addition failed.')
        }
    }

    /**
     * Processes when a vote or poll is spent (used).
     * If a poll is closed, update its status.
     */
    async outputSpent(
        txid: string,
        outputIndex: number,
        topic: string):
        Promise<void> {
        this.onTopic(topic)

    }

    /**
     * Processes when a UTXO is deleted.
     */
    async outputDeleted(
        txid: string,
        outputIndex: number,
        topic: string):
        Promise<void> {
            console.log(`Received spend notification for TXID: ${txid}, Output Index: ${outputIndex}.`)
            
            
            this.onTopic(topic)
    
        const result = await this.collection?.deleteMany({ txid, outputIndex })
        console.log('Output spend processed. Database result:\n%O', result)
        // await this.storage.deleteOutput(txid, outputIndex, topic)
    }

    /**
     * Handles lookup requests for:
     * - Polls (whether they are open or closed)
     * - Votes (whether they exist for a given poll)
     */
    async lookup(question: LookupQuestion): Promise<LookupAnswer | LookupFormula> {


        throw new Error('Unknown lookup service requested')
    }

    /**
     * Returns documentation for the lookup service.
     */
    async getDocumentation(): Promise<string> {
        return `
      # Voting Lookup Service
      - Used to track open/closed polls and vote statuses.
      - Supports queries to check poll validity and existing votes.
    `
    }

    /**
     * Returns metadata for the lookup service.
     */
    async getMetaData() {
        return {
            name: "VotingLookupService",
            shortDescription: "Tracks and validates polls and votes",
            iconURL: "/icons/lookup.png",
            version: "1.0",
            informationURL: "/docs/lookup"
        }
    }
}
