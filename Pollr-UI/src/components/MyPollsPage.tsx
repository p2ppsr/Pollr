import React, { useEffect, useState } from "react"
import PollsDisplay from "../utils/DisplayPolls"
import {Poll} from "../types/types"
import { fetchMypolls , fetchopenvotes} from "../utils/PollrActions"
// import { fetchMypolls ,getPoll, fetchopenvotes, closePoll} from "../utils/PollrActions"

const viewPoll = async (pollId: string): Promise<{ type: "close" | "open" | "completed", data: string[] }> => {
  //  let type:  "close" | "open" | "completed" =  (await getPoll(pollId.toString())).pollStatus
   let result: Record<string, number>[] = await fetchopenvotes(pollId.toString())
   
      const stringArray: string[] = result.map(record => {
        // Each record is assumed to have a single key-value pair.
        const [option, count] = Object.entries(record)[0]
        return `${option}: ${count}`
      })
      return {
        type: 'close',
        data:stringArray,
      }
}

const MyPollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([])
  useEffect(() => {
    // fetchMypolls()
    fetchMypolls().then((data) => {
      setPolls(data as Poll[])
    })
  }, [])

  return (
    <PollsDisplay 
      polls={polls} 
      onPollAction={viewPoll} 
      title="My Polls" 
      actionLabel="Close this poll"
    />
  )
}

export default MyPollsPage
