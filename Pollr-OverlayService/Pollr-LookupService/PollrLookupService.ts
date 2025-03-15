import { LookupService, LookupQuestion, LookupAnswer, LookupFormula } from '@bsv/overlay'
import { Script } from '@bsv/sdk'
import { MongoClient, Collection } from 'mongodb'
import pushdrop from 'pushdrop'
import { PollQuery, VoteCounts } from './types.js'
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
    async getNextId(): Promise<number> {
        try {
            const result = await this.nextid?.findOneAndUpdate(
                {}, // Match the single document
                { $inc: { nextId: 1 } }, // Increment the stored nextId by 1
                { returnDocument: "before", upsert: true } // Return old value before update
            );

            if (!result || !result.value) {
                // If no document existed, initialize with ID 1
                await this.nextid?.insertOne({ nextId: 2 }); // The next available ID will be 2
                return 1; // The first ID assigned
            }

            return result.value.nextId; // The assigned ID before incrementing
        } catch (error) {
            console.error("Error updating next ID:", error);
            return -1;
        }
    }
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
    ): Promise<void> {
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
                    pollId: this.getNextId().toString(),
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
            }//need to spend all vote tokens related to that poll, also need to save that data here. maybe not because it will just call output added?
            // try topic manager 
        } catch (error) {
            console.error("Error deleting from collections:", error)
        }
    }

    async getVotesforPoll(pollId: string): Promise<{}> {
        const cursor = await this.votes?.find({ pID: pollId }).toArray();
        let response = []
        for await (const result of cursor!) {
            response.push({ walID: result.walID as string, pollId: result.pollId, index: result.index })
        }


        const voteCounts: { [key: string]: number } = {};

        // Loop through response and count votes based on the index field
        for (const vote of response) {
            // If the index field is not one of the expected options, you can skip or handle it as needed.
            if (vote.index === "Yes" || vote.index === "No" || vote.index === "Maybe") {
                voteCounts[vote.index] = (voteCounts[vote.index] || 0) + 1;
            }
        }

        return voteCounts;
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
        const { type, pollId, voterId, status } = question.query as PollQuery

        // Helper function to validate non-empty strings
        const isValid = (val?: string) => Boolean(val && val.trim())

        let cursor: any

        if (type === "vote" && isValid(pollId) && isValid(voterId)) {
            // **Check for duplicate votes**
            cursor = await this.votes?.findOne({ pollId, voterId })

            return {
                type: "freeform",
                result: {
                    message: cursor ? "Voter has already voted." : "Voter has not voted yet.",
                    voteDetails: cursor || null
                }
            }
        }// unneeded maybe

        if (type === "poll") {//works but need to change data, cant be sharing this much info from the database
            
            if (status === "all") {
                
                // **Fetch all polls (both open & closed)**
                console.log("Fetching all polls...")
                let pollvotes = []
                cursor = await this.opens?.find({}).toArray()
                for await (const result of cursor!) {
                    pollvotes.push(await this.getVotesforPoll(cursor.pollId))
                }

                return {
                    type: "freeform",
                    result: {
                        message: "All polls retrieved.",
                        polls: cursor,
                        votes: pollvotes
                    }
                }
            }

            if (status === "closed") {
                // **Fetch all closed polls or a specific closed poll**
                cursor = isValid(pollId)
                    ? await this.closes?.findOne({ pollId })
                    : await this.closes?.find({}).toArray()//should store into the database the results so that way its easier, change it in the topic manager
                
                return {
                    type: "freeform",
                    result: {
                        message: "Closed poll results retrieved.",
                        polls: cursor
                    }
                }
            }

            if (status === "open") {
                // **Fetch all open polls or a specific open poll**
                cursor = isValid(pollId)
                    ? await this.opens?.findOne({ pollId })
                    : await this.opens?.find({}).toArray()

                return {
                    type: "freeform",
                    result: {
                        message: "Open poll interim results retrieved.",
                        polls: cursor//changed these to for loop into the votes collection to know interim results
                    }
                }
            }

            if (isValid(pollId)) {
                // **General Poll Lookup (Search in both open & closed)**
                cursor = await this.closes?.aggregate([
                    { $match: { pollId } },
                    {
                        $unionWith: {
                            coll: this.opens?.collectionName || "opens",
                            pipeline: [{ $match: { pollId } }]
                        }
                    }
                ]).toArray()

                return {
                    type: "freeform",
                    result: {
                        message: "Poll results retrieved from both open and closed collections.",
                        polls: cursor
                    }
                }
            }
        }

        // **If no valid query parameters are provided, return an error response**
        return {
            type: "freeform",
            result: {
                error: "Invalid query: a valid pollId is required."
            }
        }
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
