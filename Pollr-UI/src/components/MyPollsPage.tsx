import React, { useEffect, useState } from "react";
import PollsDisplay from "../utils/DisplayPolls";
import {Poll} from "../types/types"
const fetchMyPolls = async () => {
  return [
    { id: 101, name: "fav_movie", desc: "Favorite Movie?", date: "03/01/25" },
    { id: 102, name: "fav_food", desc: "Favorite Food?", date: "03/02/25" },
  ];
};

const closePoll = async (pollId: number): Promise<{ type: "close"; data: string[] }> => {
  const pollResults: Record<number, Record<string, number>> = {
    101: { "Movie 1": 20, "Movie 2": 30, "Movie 3": 15 },
    102: { "Pizza": 40, "Burger": 25, "Sushi": 18 },
  };

  const results = pollResults[pollId] || {};
  const formattedResults = Object.entries(results).map(([choice, votes]) => `${choice}: ${votes} votes`);

  return {
    type: "close",
    data: formattedResults, // Now returns choices with their vote counts
  };
};

const MyPollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    fetchMyPolls().then(setPolls);
  }, []);

  return (
    <PollsDisplay 
      polls={polls} 
      onPollAction={closePoll} 
      title="My Polls" 
      actionLabel="Close this poll"
    />
  );
};

export default MyPollsPage;
