export interface Poll {
    id: number;
    name: string;
    desc: string;
    date: string;
  }
 export type PollQuery = {
     type: "vote" | "poll";
     pollId?: string;
     voterId?: string;
     status?: "open" | "closed" | "all";
   };
  export interface Option {
    value: string
  }