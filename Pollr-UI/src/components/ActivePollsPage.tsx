import React, { useEffect, useState } from "react"
import PollsDisplay from "../utils/DisplayPolls"
import { Poll,OptionResults } from "../types/types"
import { fetchAllpolls, fetchopenvotes } from "../utils/PollrActions"

export const vote = async (pollId: string): Promise<{ type: "open"; data: string[] }> => {
  let result: Record<string, number>[] = await fetchopenvotes(pollId.toString())
  const stringArray: string[] = result.map(record => {
    // Each record is assumed to have a single key-value pair.
    const [option, count] = Object.entries(record)[0]
    return `${option}: ${count}`
  })
  return {
    type: "open",
    data:stringArray,
  }
}

const ActivePollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([])
  
  useEffect(() => {
    fetchAllpolls().then((data) => {
      setPolls(data)
    })
  }, [])


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
