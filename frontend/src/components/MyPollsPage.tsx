import React, { useEffect, useState } from "react"
import PollsDisplay from "../utils/DisplayPolls"
import {Poll} from "../types/types"
import { fetchMypolls , fetchOpenVotes} from "../utils/PollrActions"
import { styled } from '@mui/system'

import {LinearProgress} from '@mui/material'

const LoadingBar = styled(LinearProgress)({
  margin: '1em'
})

const viewPoll = async (pollId: string): Promise<{ type: "close" | "open" | "completed", data: string[] }> => {
   let result: Record<string, number>[] = await fetchOpenVotes(pollId.toString())
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
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchMypolls().then((data) => {
      setPolls(data as Poll[])
      setLoading(false)
    })
  }, [])
if (loading) {
    return (
     <LoadingBar></LoadingBar>
    )
  }
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
