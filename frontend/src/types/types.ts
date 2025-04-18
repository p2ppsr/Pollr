export interface Poll {
  key: string
  avatarUrl?: string
  id: string
  name: string
  desc: string
  date: string
  status?: string
}
export interface OptionResults {
  optionText: string
  numVotes: number
}
export type PollQuery = {
  type: "vote" | "poll" | "allvotesfor" | "allpolls"
  txid?: string
  voterId?: string
  status?: "open" | "closed" | "all" | "any1"
}
export interface Option {
  value: string
}
