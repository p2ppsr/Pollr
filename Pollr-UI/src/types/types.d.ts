declare module 'react-toastify'
declare module '@babbage/sdk-ts'

// Interfaces used, it is necessary to declare them here
export interface Token {
  inputs: Record<string, OptionalEnvelopeEvidenceApi> | undefined
  mapiResponses: MapiResponseApi[] | undefined
  outputScript: BitcoinOutputScript
  proof: Buffer | TscMerkleProofApi | undefined
  rawTX: string
  satoshis: number
  txid: string
  vout: number
  outputIndex?: number
  lockingScript?: any
}

export interface Task {
  task: string
  sats: number
  token: Token
}
