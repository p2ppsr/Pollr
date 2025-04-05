import React, { useEffect, useState } from "react"
import PollsDisplay from "../utils/DisplayPolls"
import { Poll,OptionResults } from "../types/types"
import { fetchAllOpenPolls, fetchOpenVotes } from "../utils/PollrActions"
import { styled } from '@mui/system'

import {LinearProgress} from '@mui/material'

const LoadingBar = styled(LinearProgress)({
  margin: '1em'
})
export const fetchPollInfo = async (poll: Poll): Promise<{ type: "open"; data: string[] }> => {
  console.log(`fetching poll: ${poll.id}`)
  let result: Record<string, number>[] = await fetchOpenVotes(poll.id)
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
      onPollAction={fetchPollInfo}
      actionLabel="Vote for your choice"
      title="Active Polls"
    />
  )
}

export default ActivePollsPage
