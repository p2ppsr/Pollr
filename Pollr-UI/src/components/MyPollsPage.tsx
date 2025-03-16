import React, { useEffect, useState } from "react";
import PollsDisplay from "../utils/DisplayPolls";
import {Poll} from "../types/types"
import { fetchMypolls ,getPoll, fetchopenvotes} from "../utils/PollrActions";

const closePoll = async (pollId: number): Promise<{ type: "close"; data: string[] }> => {
   let result: Record<string, number>[] = await fetchopenvotes(pollId.toString());
      const stringArray: string[] = result.map(record => {
        // Each record is assumed to have a single key-value pair.
        const [option, count] = Object.entries(record)[0];
        return `${option}: ${count}`;
      });
      return {
        type: "close",
        data:stringArray,
      };
};

const MyPollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    fetchMypolls().then((data) => {

      setPolls(data);
    });
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
