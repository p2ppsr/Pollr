import React, { useEffect, useState } from "react";
import PollsDisplay from "../utils/DisplayPolls";
import { Poll } from "../types/types";

const fetchCompletedPolls = async (): Promise<Poll[]> => {
  return [
    { id: 201, name: "best_movie", desc: "What is the best movie?", date: "02/10/25" },
    { id: 202, name: "best_sport", desc: "What is the best sport?", date: "02/12/25" },
  ];
};

const fetchPollResults = async (pollId: number): Promise<{ type: "completed"; data: string[]; winner: string }> => {
  const pollResults: Record<number, Record<string, number>> = {
    201: { "Movie A": 35, "Movie B": 50, "Movie C": 20 },
    202: { "Football": 45, "Basketball": 30, "Tennis": 25 },
  };

  const results = pollResults[pollId] || {};
  const formattedResults = Object.entries(results).map(([choice, votes]) => `${choice}: ${votes} votes`);

  // Determine the winner by finding the option with the highest votes
  const winner = Object.entries(results).reduce((max, entry) => (entry[1] > (results[max] || 0) ? entry[0] : max), "");

  return {
    type: "completed",
    data: formattedResults,
    winner: winner,
  };
};

const CompletedPollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    fetchCompletedPolls().then(setPolls);
  }, []);

  return (
    <PollsDisplay 
      polls={polls} 
      onPollAction={fetchPollResults} 
      title="Completed Polls" 
      actionLabel="Poll Results"
    />
  );
};

export default CompletedPollsPage;