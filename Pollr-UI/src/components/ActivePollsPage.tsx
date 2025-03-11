import React, { useEffect, useState } from "react";
import PollsDisplay from "../utils/DisplayPolls";
import { vote } from "../utils/Vote";
import {Poll} from "../types/poll"
const fetchPolls = async () => {
  return [
    { id: 1, name: "fav_lang", desc: "Vote for your favorite language", date: "10/26/25" },
    { id: 2, name: "best_framework", desc: "Choose the best framework", date: "10/28/25" },
  ];
};

const ActivePollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    fetchPolls().then(setPolls);
  }, []);

  return <PollsDisplay polls={polls} onPollAction={vote} actionLabel="Vote for your choice" title ="ActivePolls" />;
};

export default ActivePollsPage;
