// src/utils/vote.ts
import { fetchopenvotes } from "../utils/PollrActions"

  export const vote = async (pollId: number): Promise<{ type: "vote"; data: string[] }> => {
    let result: Record<string, number>[] = await fetchopenvotes(pollId.toString());
    const stringArray: string[] = result.map(record => {
      // Each record is assumed to have a single key-value pair.
      const [option, count] = Object.entries(record)[0];
      return `${option}: ${count}`;
    });
    return {
      type: "vote",
      data:stringArray,
    };
  };
  