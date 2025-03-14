export interface Pollrvotes {
    txid: string
    outputIndex: number
    type: string
    walId: string
    pollName: string
    pollDescription: string
    numopts: string
    options: string[]
  }
export interface PollQuery{
    pollId: string
    voterId: string
}