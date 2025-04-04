import { LookupService, LookupQuestion, LookupAnswer, LookupFormula } from '@bsv/overlay'
import { Script, PushDrop, Utils } from '@bsv/sdk'
import { MongoClient, Collection } from 'mongodb'
// import pushdrop from 'pushdrop'
import { PollQuery, UTXOReference } from './types.js'
export type PollrStorage = {
    db_string: string
}

export class PollrLookupService implements LookupService {
    constructor(private storage: PollrStorage) { }
    private votes: Collection | undefined
    private closes: Collection | undefined
    private opens: Collection | undefined
    private nextid: Collection | undefined
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
            this.nextid = this.connection.db('pollrservice').collection('Id')
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
    ): Promise<void> {
        this.onTopic(topic)
        try {
            const decodedOutput = await PushDrop.decode(outputScript)
            // console.log('Decoded Output:\n%O', decodedOutput)
            //////////////////////////////////////////////
            console.log(`outputScript" ${outputScript.toHex()}, txid: ${txid}`)
            let result
            const reader = new Utils.Reader(decodedOutput.fields[0])
            const decodedFields = []
            while (!reader.eof()) {
                const fieldLength = reader.readVarIntNum()
                const fieldBytes = reader.read(fieldLength)
                decodedFields.push(Utils.toUTF8(fieldBytes))
            }
            const firstField = decodedFields[0]
            if (firstField === "vote") {
                console.log("ls Processing a vote...")
                result = await this.votes?.insertOne({
                    txid,
                    outputIndex,
                    walID: decodedFields[1].toString(),
                    pollId: decodedFields[2].toString(),
                    index: decodedFields[3].toString()
                })
                console.log('ls vote added successfully to the database:\n%O', result)

            } else if (firstField === "open") {
                // console.log("ls Processing a poll opening...")
                // const id = await this.getNextId()
                const result = await this.opens?.insertOne({
                    txid,
                    outputIndex,
                    walID: decodedFields[1].toString(),
                    pollName: decodedFields[2].toString(),
                    // pollId: id.toString(),
                    pollDescription: decodedFields[3].toString(),
                    numOptions: parseInt(decodedFields[4].toString(), 10),  // Ensure it's a number
                    optionsType: decodedFields[5].toString(),
                    date: decodedFields[6].toString(),
                    options: decodedFields.slice(7, 7 + parseInt(decodedFields[4].toString(), 10)).map((buffer: any) => buffer.toString())

                })
                console.log('ls poll added successfully to the database:\n%O', result)

            } else if (firstField === "close") {
                console.log("ls Processing a close...")
                result = await this.closes?.insertOne({
                    txid,
                    outputIndex,
                    walID: decodedFields[1].toString(),
                    // pollId: decodedFields[2].toString(),
                    index: decodedFields[3].toString()
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
        console.log("ls leaving!")
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
            }//need to spend all vote tokens related to that poll, also need to save that data here. maybe not because it will just call output added?
            // try topic manager 
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
        if (question.query === undefined || question.query === null) {
            throw new Error('A valid query must be provided!')
        }
        console.log(`query: ${JSON.stringify(question.query)}`)
        let cursor: any
        const { type, txid, voterId, status } = question.query as PollQuery
        if (type === "vote") {
            cursor = await this.votes?.find({pollId: txid, walID: voterId }).toArray()
            console.log(`found votes: ${cursor}`)
        }
        else if (type == "poll") {
            if(status == 'closed')
            {
                cursor = await this.closes?.find({ txid: txid }).toArray()
            }
            else{
                cursor = await this.opens?.find({ txid: txid }).toArray()
            }
        }
        else if (type === "allvotesfor") {
            cursor = await this.votes?.find({ pollId: txid }).toArray()
        }
        else if (type === "allpolls") {
            if(status == 'open')
            {
                cursor = await this.opens?.find({}).toArray()
            }
            else{
                cursor = await this.closes?.find({}).toArray()
            }
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
