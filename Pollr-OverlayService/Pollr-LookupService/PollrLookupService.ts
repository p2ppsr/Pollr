import { LookupService, LookupQuestion, LookupAnswer, LookupFormula } from '@bsv/overlay'
import {Script } from '@bsv/sdk'
import { MongoClient, Collection } from 'mongodb'
import pushdrop from 'pushdrop'
import { PollQuery } from './types.js'
export type PollrStorage = {
    db_string: string
}
export class PollrLookupService implements LookupService {
    constructor(private storage: PollrStorage) { }
    private votes: Collection | undefined
    private closes: Collection | undefined
    private opens: Collection | undefined
    private connection: MongoClient | undefined
    /**
     * Processes the event when a new UTXO is added to a voting topic.
     * This keeps track of open polls and votes.
     */
    async connectToDB(): Promise<void> {
        const client = new MongoClient(this.storage.db_string)

        try {
            this.connection = await client.connect()
            console.log('Database connection established successfully.')
            this.votes = this.connection.db('pollrservice').collection('pollrvote')
            this.closes = this.connection.db('pollrservice').collection('pollrclose')
            this.opens = this.connection.db('pollrservice').collection('pollropen')
        } catch (error) {
            console.error('Failed to connect to the database:\n%O', error)
            throw new Error('Database connection error.')
        }
    }

    async onTopic(topic: string) {
        if (topic !== 'tm_pollr') {
            throw new Error(`Invalid topic "${topic}" for this service.`)
        }
        return true
    }
    async outputAdded?(
        txid: string,
        outputIndex: number,
        outputScript: Script,
        topic: string
      ): Promise<void>  {
        this.onTopic(topic)
        try {
            const decodedOutput = pushdrop.decode({
                script: outputScript.toHex(),
                fieldFormat: 'buffer',
            })
            console.log('Decoded Output:\n%O', decodedOutput)
            //////////////////////////////////////////////
            let result
            const firstField = decodedOutput.fields[0].toString("utf8")
            if (firstField === "vote") {
                console.log("ls Processing a vote...")
                result = await this.votes?.insertOne({
                    txid,
                    outputIndex,
                    walID: decodedOutput.fields[1].tostring(),
                    pollId: decodedOutput.fields[2].tostring(),
                    index: decodedOutput.fields[3].tostring()
                })
                console.log('ls vote added successfully to the database:\n%O', result)

            } else if (firstField === "open") {
                console.log("ls Processing a poll opening...")
                const result = await this.opens?.insertOne({
                    txid,
                    outputIndex,
                    walID: decodedOutput.fields[1].toString(),
                    pollName: decodedOutput.fields[2].toString(),
                    pollDescription: decodedOutput.fields[3].toString(),
                    numOptions: parseInt(decodedOutput.fields[4].toString(), 10),  // Ensure it's a number
                    optionsType: decodedOutput.fields[5].toString(),
                    date: decodedOutput.fields[6].toString(),
                    options: decodedOutput.fields.slice(7, 7 + parseInt(decodedOutput.fields[4].toString(), 10)).map((buffer: any) => buffer.toString())

                })
                console.log('ls poll added successfully to the database:\n%O', result)

            } else if (firstField === "close") {
                console.log("ls Processing a close...")
                result = await this.closes?.insertOne({
                    txid,
                    outputIndex,
                    walID: decodedOutput.fields[1].tostring(),
                    pollId: decodedOutput.fields[2].tostring(),
                    index: decodedOutput.fields[3].tostring()
                })
            } else {
                console.log("ls Invalid transaction type!")
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

        try {
            const collections = await this.connection?.db('pollrservice').listCollections().toArray() || []

            for (const collection of collections) {
                await this.connection?.db('pollrservice').collection(collection.name).deleteMany({ txid, outputIndex })
                console.log(`Deleted documents from collection: ${collection.name}`)
            }
        } catch (error) {
            console.error("Error deleting from collections:", error)
        }
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

        try {
            const collections = await this.connection?.db('pollrservice').listCollections().toArray() || []

            for (const collection of collections) {
                await this.connection?.db('pollrservice').collection(collection.name).deleteMany({ txid, outputIndex })
                console.log(`Deleted documents from collection: ${collection.name}`)
            }
        } catch (error) {
            console.error("Error deleting from collections:", error)
        }
    }

    /**
     * Handles lookup requests for:
     * - Polls (whether they are open or closed)
     * - Votes (whether they exist for a given poll)
     */
    async lookup(question: LookupQuestion): Promise<LookupAnswer | LookupFormula> {

        if (question.service !== 'ls_pollr') {
            throw new Error(`Invalid service name "${question.service}" for this lookup service.`)
        }
        const { pollId, voterId } = question.query as PollQuery

        // Helper to check for non-empty strings.
        const isValid = (val?: string) => Boolean(val && val.trim())

        // We'll use a cursor to iterate the query results.
        let cursor: any

        if (isValid(pollId)) {
            if (isValid(voterId)) {
                // Vote lookup: require both pollId and voterId.
                cursor = this.votes?.find({ pollId, voterId })
            } else {
                // Poll lookup: when only pollId is provided,
                // search both 'closes' and 'opens' collections.
                // Using aggregation with $unionWith to combine both.
                cursor = this.closes?.aggregate([
                    { $match: { pollId } },
                    {
                        $unionWith: {
                            coll: this.opens?.collectionName || "opens",
                            pipeline: [{ $match: { pollId } }]
                        }
                    }
                ])
            }
        } else {
            // If pollId is missing or invalid, throw an error.
            throw new Error("Invalid query: a valid pollId is required.")
        }

        const response: LookupFormula = []
        for await (const result of cursor!) {
            response.push({ txid: result.txid as string, outputIndex: result.outputIndex })
        }

        return response
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
