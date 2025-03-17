export interface Poll {
  id: number
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
  type: "vote" | "poll"
  pollId?: string
  voterId?: string
  status?: "open" | "closed" | "all" | "any1"
}
export interface Option {
  value: string
}
export interface VoteData{
  _id: string;
  txid: string;
  outputIndex: number;
  walID: string;
  pollId: string;
  index: string;
}