import dotenv from 'dotenv'
import type { Knex } from 'knex'
dotenv.config()

const config: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: 3306,
    user: 'Pollr',
    password: '@Cb118296',
    database: 'pollrdata'
  },
  useNullAsDefault: true,
  migrations: {
    directory: './src/migrations'
  },
  pool: {
    min: 0,
    max: 7,
    idleTimeoutMillis: 15000
  }
}

const knexfile: { [key: string]: Knex.Config } = {
  development: config,
  staging: config,
  production: config
}

export default knexfile