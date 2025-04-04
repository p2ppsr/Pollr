import React, { useEffect, useState } from "react"
import PollsDisplay from "../utils/DisplayPolls"
import { Poll,OptionResults } from "../types/types"
import { fetchAllOpenPolls, fetchOpenVotes } from "../utils/PollrActions"
import { styled } from '@mui/system'

import {LinearProgress} from '@mui/material'

const LoadingBar = styled(LinearProgress)({
  margin: '1em'
})
export const vote = async (pollId: string): Promise<{ type: "open"; data: string[] }> => {
  console.log(`fetching poll: ${pollId}`)
  let result: Record<string, number>[] = await fetchOpenVotes(pollId.toString())
  const stringArray: string[] = result.map(record => {
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllOpenPolls().then((data) => {
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
      onPollAction={vote}
      actionLabel="Vote for your choice"
      title="Active Polls"
    />
  )
}

export default ActivePollsPage
