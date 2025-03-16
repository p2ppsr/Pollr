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
  export type PollQuery = {
    type: "vote" | "poll";
    pollId?: string;
    voterId?: string;
    status?: "open" | "closed" | "all" | "any1";
  };
export type PollResponse = {
  pollId: string;
  voterId?: string; // Present only for vote token
  interimVotes?: Record<string, number>; // Present only for open polls
  finalVotes?: Record<string, number>; // Present only for closed polls
};
export interface VoteCounts {
  [option: string]: number;
}