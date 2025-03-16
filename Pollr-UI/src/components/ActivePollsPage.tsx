import React, { useEffect, useState } from "react"
import PollsDisplay from "../utils/DisplayPolls"
import { vote } from "../utils/Vote"
import { Poll,OptionResults } from "../types/types"
import { fetchAllpolls } from "../utils/PollrActions"

const ActivePollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([])
  
  useEffect(() => {
    fetchAllpolls().then((data) => {
      setPolls(data);
    });
  }, []);


  return (
    <PollsDisplay
      polls={polls}
      onPollAction={vote}
      actionLabel="Vote for your choice"
      title="Active Polls"
    />
  )
}

export default ActivePollsPage
