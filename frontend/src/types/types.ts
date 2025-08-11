export interface Poll {
  key: string
  avatarUrl?: string
  id: string
  name: string
  desc: string
  date: string
  status?: string
  optionstype?: string
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
