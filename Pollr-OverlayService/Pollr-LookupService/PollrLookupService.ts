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
        console.log("Getting the next ID")
        try {
            // Query for the current document
            const currentDoc = await this.nextid?.findOne({})
            let currentId: number

            if (!currentDoc) {
                // If no document exists, start at 1
                currentId = 1
            } else {
                currentId = currentDoc.nextId
            }

            // Delete all documents in the collection
            await this.nextid?.deleteMany({})

            // Insert new document with the next ID
            await this.nextid?.insertOne({ nextId: currentId + 1 })

            console.log(`ID is: ${currentId}`)
            return currentId
        } catch (error) {
            console.error("Error updating next ID:", error)
            return -1
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
            const decodedOutput = pushdrop.decode({
                script: outputScript.toHex(),
                fieldFormat: 'buffer',
            })
            // console.log('Decoded Output:\n%O', decodedOutput)
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
                // console.log("ls Processing a poll opening...")
                const id = await this.getNextId()
                const result = await this.opens?.insertOne({
                    txid,
                    outputIndex,
                    walID: decodedOutput.fields[1].toString(),
                    pollName: decodedOutput.fields[2].toString(),
                    pollId: id.toString(),
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

    async getVotesforPoll(pollId: string): Promise<Record<string, number>> {
        console.log(pollId);
        const votesArray = await this.votes?.find({ pID: pollId }).toArray();
        const poll = await this.opens?.findOne({ pollId: pollId });

        if (!poll) {
            throw new Error(`Poll not found for pollId: ${pollId}`);
        }

        // Use the options array from the poll, e.g. ["2", "5", "8", "1"]
        const optionsArray: string[] = poll.options;

        // Initialize voteCounts using option text as keys.
        const voteCounts: Record<string, number> = {};
        for (let i = 0; i < optionsArray.length; i++) {
            voteCounts[optionsArray[i]] = 0;
        }

        // Loop through each vote and increment the count for the corresponding option.
        // Assuming vote.index is the option index chosen by the voter.
        for (const vote of votesArray!) {
            const optionText = optionsArray[vote.index];
            if (optionText in voteCounts) {
                voteCounts[optionText]++;
            } else {
                // Optional: handle unexpected indices.
                voteCounts[optionText] = 1;
            }
        }

        console.log(`votes for poll ${pollId}: ${JSON.stringify(voteCounts)}`);
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
            //Check for duplicate votes
            cursor = await this.votes?.findOne({ pollId, voterId })
            return {
                type: "freeform",
                result: {
                    voteDetails: cursor || null
                }
            }
        }// unneeded maybe

        if (type === "poll") {//works but need to change data, cant be sharing this much info from the database
            let pollvotes: {}[] = []
            let dbpolls: {}[] = []
            if (status == "any1") {
                if (isValid(voterId)) {
                    //General Poll Lookup (Search in both open & closed)**
                    console.log("Fetching specific...")

                    cursor = await this.opens?.find({ pollId: pollId }).toArray()
                    for await (const result of cursor!) {
                        console.log(`getting votes for ${result.pollId}`)
                        pollvotes.push(await this.getVotesforPoll(result.pollId))
                        dbpolls.push({
                            pollName: result.pollName,
                            pollId: result.pollId,
                            pollDescription: result.pollDescription,
                            numOptions: result.numOptions,
                            optionsType: result.optionsType,
                            date: result.date,
                            options: result.options,
                            walID: result.walID,
                            status: 'open'
                        })
                    }
                    cursor = await this.closes?.find({ pollId: pollId }).toArray()
                    for await (const result of cursor!) {
                        console.log(`getting votes for ${result.pollId}`)
                        pollvotes.push(await this.getVotesforPoll(result.pollId))
                        dbpolls.push({
                            pollName: result.pollName,
                            pollId: result.pollId,
                            pollDescription: result.pollDescription,
                            numOptions: result.numOptions,
                            optionsType: result.optionsType,
                            date: result.date,
                            options: result.options,
                            walID: result.walID,
                            status: 'close'

                        })
                    }

                }
            }
            if (status === "all") {
                //Fetch all polls (both open & closed)
                console.log(`voterId: ${voterId}`)
                console.log("Fetching all polls...")
                cursor = await this.opens?.find({}).toArray()
                for await (const result of cursor!) {
                    console.log(`getting votes for ${result.pollId}`)
                    pollvotes.push(await this.getVotesforPoll(result.pollId))
                    dbpolls.push({
                        pollName: result.pollName,
                        pollId: result.pollId,
                        pollDescription: result.pollDescription,
                        numOptions: result.numOptions,
                        optionsType: result.optionsType,
                        date: result.date,
                        options: result.options,
                        walID: result.walID
                    })
                }
            }

            if (status === "closed") {
                //Fetch all closed polls or a specific closed poll
                if (isValid(pollId)) {
                    cursor = await this.closes?.findOne({ pollId })
                    // pollvotes.push(cursor.results)
                    dbpolls.push({
                        pollName: cursor.pollName,
                        pollId: cursor.pollId,
                        pollDescription: cursor.pollDescription,
                        numOptions: cursor.numOptions,
                        optionsType: cursor.optionsType,
                        date: cursor.date,
                        options: cursor.options,
                        walID: cursor.walID,
                        status: 'close'

                    })
                }
            }
            else {
                cursor = await this.closes?.find({}).toArray()
                for await (const result of cursor!) {
                    // pollvotes.push(result.results)
                    dbpolls.push({
                        pollName: result.pollName,
                        pollId: result.pollId,
                        pollDescription: result.pollDescription,
                        numOptions: result.numOptions,
                        optionsType: result.optionsType,
                        date: result.date,
                        options: result.options,
                        walID: result.walID,
                        status: 'close'

                    })
                }
            }

            if (status === "open") {
                //Fetch all open polls or a specific open poll
                if (isValid(pollId)) {
                    cursor = await this.opens?.findOne({ pollId: pollId })
                    pollvotes.push(await this.getVotesforPoll(cursor.pollId))
                    dbpolls.push({
                        pollName: cursor.pollName,
                        pollId: cursor.pollId,
                        pollDescription: cursor.pollDescription,
                        numOptions: cursor.numOptions,
                        optionsType: cursor.optionsType,
                        date: cursor.date,
                        options: cursor.options,
                        walID: cursor.walID,
                        status: 'open'
                    })
                }
                else {
                    cursor = await this.opens?.find({}).toArray()
                    for await (const result of cursor!) {
                        pollvotes.push(await this.getVotesforPoll(result.pollId))
                        dbpolls.push({
                            pollName: result.pollName,
                            pollId: result.pollId,
                            pollDescription: result.pollDescription,
                            numOptions: result.numOptions,
                            optionsType: result.optionsType,
                            date: result.date,
                            options: result.options,
                            walID: result.walID,
                            status: 'open'
                        })
                    }
                }

            }
            return {
                type: "freeform",
                result: {
                    polls: dbpolls,
                    votes: pollvotes
                }
            }

        }

        //If no valid query parameters are provided, return an error response**
        return {
            type: "freeform",
            result: {
                error: "Invalid query"
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
