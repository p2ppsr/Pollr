import dotenv from 'dotenv'
import express from 'express'
import bodyparser from 'body-parser'
import { Engine, KnexStorage, STEAK, TaggedBEEF } from '@bsv/overlay'
import { WhatsOnChain, NodejsHttpClient, ARC, ArcConfig, MerklePath } from '@bsv/sdk'
import { MongoClient } from 'mongodb'
import https from 'https'
import Knex from 'knex'
import knexfile from '../knexfile.js'
import { spawn } from 'child_process'
import { SyncConfiguration } from '@bsv/overlay/SyncConfiguration.ts'
import { PollrLookupService } from '../Pollr-LookupService/PollrLookupService.js'
import { PollrTopicManager } from '../Pollr-TopicManager/PollrTopicManager.js'
import { tmpdir } from 'os'
const knex = Knex(knexfile.development)
const app = express()
dotenv.config()
app.use(bodyparser.json({ limit: '1gb', type: 'application/json' }))
app.use(bodyparser.raw({ limit: '1gb', type: 'application/octet-stream' }))

// Load environment variables
const {
    PORT,
    DB_CONNECTION,
    NODE_ENV,
    HOSTING_DOMAIN,
    TAAL_API_KEY,
    SERVER_PRIVATE_KEY,
    DOJO_URL,
    MIGRATE_KEY
} = process.env

const HTTP_PORT = NODE_ENV !== 'development'
    ? 3000
    : (PORT !== undefined ? PORT : (PORT !== undefined ? PORT : 8080))

// Configure with custom URLs specific to your supported topics.
// const knownDeployedOSN = `https://${NODE_ENV === 'production' ? '' : 'staging-'}overlay.babbage.systems`
// const SLAP_TRACKERS = [knownDeployedOSN]
// const SHIP_TRACKERS = [knownDeployedOSN]
// const SYNC_CONFIGURATION: SyncConfiguration = {
//     tm_helloworld: [knownDeployedOSN],
//     tm_uhrp: false
// }

// Initialization the overlay engine
let engine: Engine
const initialization = async () => {
    console.log('Starting initialization...')
    try {
        if (!DB_CONNECTION)
            throw new Error("Empty Pollr db_string given")

        const lsPollr = new PollrLookupService({
            db_string: DB_CONNECTION
        })
        const result = await knex.migrate.latest()
        console.log('Result of migration: %O', result)
        try {
            await lsPollr.connectToDB()
        }
        catch (e) {
            throw new Error(`Failed to connect to DB collection: ${e}`)
        }
        const tmPollr = new PollrTopicManager(lsPollr)
        const arcConfig: ArcConfig = {
            deploymentId: '1',
            apiKey: TAAL_API_KEY,
            callbackUrl: `${HOSTING_DOMAIN as string}/arc-ingest`,
            callbackToken: 'fredFlinstones',
            httpClient: new NodejsHttpClient(https)
        }
        console.log('Initializing Engine...')
        try {
            // Configuration for ARC
            const arcConfig: ArcConfig = {
                deploymentId: '1',
                apiKey: TAAL_API_KEY,
                callbackUrl: `${HOSTING_DOMAIN as string}/arc-ingest`,
                callbackToken: 'fredFlinstones',
                httpClient: new NodejsHttpClient(https)
            }
            engine = new Engine(
                {
                    tm_pollr: tmPollr
                },
                {
                    ls_pollr: lsPollr
                },
                new KnexStorage(knex),
                'scripts only',
                HOSTING_DOMAIN as string,
                undefined,
                undefined,
                undefined, //new ARC('https://arc.taal.com', arcConfig),
                undefined, //ninjaAdvertiser,
                undefined //SYNC_CONFIGURATION
            )
            console.log('Engine initialized successfully')
        } catch (engineError) {
            console.error('Error during Engine initialization:', engineError)
            throw engineError
        }
    } catch (error) {
        console.error('Initialization failed:', error)
        throw error
    }
}

// This allows the API to be used everywhere when CORS is enforced
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', '*')
    res.header('Access-Control-Allow-Methods', '*')
    res.header('Access-Control-Expose-Headers', '*')
    res.header('Access-Control-Allow-Private-Network', 'true')
    if (req.method === 'OPTIONS') {
        res.sendStatus(200)
    } else {
        next()
    }
})

// Serve a static documentation site, if you have one.
app.use(express.static('public'))

// List hosted topic managers and lookup services
app.get('/listTopicManagers', (req, res) => {
    (async () => {
        try {
            const result = await engine.listTopicManagers()
            return res.status(200).json(result)
        } catch (error) {
            return res.status(400).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
        }
    })().catch(() => {
        // This catch is for any unforeseen errors in the async IIFE itself
        res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
        })
    })
})

app.get('/listLookupServiceProviders', (req, res) => {
    (async () => {
        try {
            const result = await engine.listLookupServiceProviders()
            return res.status(200).json(result)
        } catch (error) {
            return res.status(400).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
        }
    })().catch(() => {
        res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
        })
    })
})

// Host documentation for the services
app.get('/getDocumentationForTopicManager', (req, res) => {
    (async () => {
        try {
            const result = await engine.getDocumentationForTopicManager(req.query.manager)
            res.setHeader('Content-Type', 'text/markdown')
            return res.status(200).send(result)
        } catch (error) {
            return res.status(400).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
        }
    })().catch(() => {
        res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
        })
    })
})

app.get('/getDocumentationForLookupServiceProvider', (req, res) => {
    (async () => {
        try {
            const result = await engine.getDocumentationForLookupServiceProvider(req.query.lookupServices)
            return res.status(200).json(result)
        } catch (error) {
            return res.status(400).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
        }
    })().catch(() => {
        res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
        })
    })
})

// Submit transactions and facilitate lookup requests
app.post('/submit', (req, res) => {
    (async () => {
        try {
            // Parse out the topics and construct the tagged BEEF
            const topics = JSON.parse(req.headers['x-topics'] as string)
            const taggedBEEF: TaggedBEEF = {
                beef: Array.from(req.body as number[]),
                topics
            }

            // Using a callback function, we can just return once our steak is ready
            // instead of having to wait for all the broadcasts to occur.
            await engine.submit(taggedBEEF, (steak: STEAK) => {
                return res.status(200).json(steak)
            })
        } catch (error) {
            console.error(error)
            return res.status(400).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
        }
    })().catch(() => {
        res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
        })
    })
})

app.post('/lookup', (req, res) => {
    (async () => {
        try {
            const result = await engine.lookup(req.body)
            return res.status(200).json(result)
        } catch (error) {
            console.error(error)
            return res.status(400).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
        }
    })().catch(() => {
        res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
        })
    })
})

app.post('/arc-ingest', (req, res) => {
    (async () => {
        try {
            const merklePath = MerklePath.fromHex(req.body.merklePath)
            await engine.handleNewMerkleProof(req.body.txid, merklePath, req.body.blockHeight)
            return res.status(200).json({ status: 'success', message: 'transaction status updated' })
        } catch (error) {
            console.error(error)
            return res.status(400).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
        }
    })().catch(() => {
        res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
        })
    })
})

app.post('/requestSyncResponse', (req, res) => {
    (async () => {
        try {
            const topic = req.headers['x-bsv-topic'] as string
            const response = await engine.provideForeignSyncResponse(req.body, topic)
            return res.status(200).json(response)
        } catch (error) {
            console.error(error)
            return res.status(400).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
        }
    })().catch(() => {
        res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
        })
    })
})

app.post('/requestForeignGASPNode', (req, res) => {
    (async () => {
        try {
            console.log(req.body)
            const { graphID, txid, outputIndex, metadata } = req.body
            const response = await engine.provideForeignGASPNode(graphID, txid, outputIndex)
            return res.status(200).json(response)
        } catch (error) {
            console.error(error)
            return res.status(400).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
        }
    })().catch(() => {
        res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
        })
    })
})

app.post('/migrate', (req, res) => {
    (async () => {
        if (
            typeof MIGRATE_KEY === 'string' &&
            MIGRATE_KEY.length > 10 &&
            req.body.migratekey === MIGRATE_KEY
        ) {
            const result = await knex.migrate.latest()
            res.status(200).json({
                status: 'success',
                result
            })
        } else {
            res.status(401).json({
                status: 'error',
                code: 'ERR_UNAUTHORIZED',
                description: 'Access with this key was denied.'
            })
        }
    })().catch((error) => {
        console.error(error)
        res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
        })
    })
})

// 404, all other routes are not found.
app.use((req, res) => {
    console.log('404', req.url)
    res.status(404).json({
        status: 'error',
        code: 'ERR_ROUTE_NOT_FOUND',
        description: 'Route not found.'
    })
})

// Start your Engines!
initialization()
    .then(() => {
        console.log(HTTP_PORT)
        app.listen(HTTP_PORT, () => {
            if (NODE_ENV !== 'development') {
                spawn('nginx', [], { stdio: [process.stdin, process.stdout, process.stderr] })
            }
            (async () => {
                console.log(`BSV Overlay Services Engine is listening on port ${HTTP_PORT as string}`)
                // Make sure we have advertisements for all the topics / lookup services we support
                try {
                    await engine.syncAdvertisements()
                } catch (error) {
                    console.error('Failed to sync advertisements:', error)
                }
                try {
                    await engine.startGASPSync()
                } catch (error) {
                    console.error('Failed to complete GASP sync:', error)
                }
            })().catch((error) => {
                console.error('Unexpected error occurred:', error)
            })
        })
    })
    .catch((error) => {
        console.error('Failed to initialize:', error)
        process.exit(1)
    })