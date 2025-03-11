// src/utils/vote.ts
  export const vote = async (pollId: number): Promise<{ type: "vote"; data: string[] }> => {
    return {
      type: "vote",
      data: ["React", "Vue", "Angular", "Svelte"],
    };
  };
  