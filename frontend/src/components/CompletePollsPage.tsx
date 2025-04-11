import React, { useEffect, useState } from "react"
import PollsDisplay from "../utils/DisplayPolls"
import { Poll } from "../types/types"
import { styled } from '@mui/system'
import {LinearProgress} from '@mui/material'
import { getClosedPolls, getPollResults} from "../utils/PollrActions"
const LoadingBar = styled(LinearProgress)({
  margin: '1em'
})

const fetchPollResults = async (poll: Poll): Promise<{ type: "completed"; data: string[]; winner: string }> => {
  console.log(`fetching poll: ${poll.id}`)
  let result: Record<string, number>[] = await getPollResults(poll.id)
  const stringArray: string[] = result.map(record => {
    const [option, count] = Object.entries(record)[0]
    return `${option}: ${count}`
  })

  let highestCount = -Infinity
  let winnerOption = ""
  result.forEach(record => {
    const [option, count] = Object.entries(record)[0]
    if (count > highestCount) {
      highestCount = count
      winnerOption = option
    }
  })

  return {
    type: "completed",
    data: stringArray,
    winner: winnerOption
  }
}

// const fetchPollResults = async (poll: Poll): Promise<{ type: "completed" ;data: string[]; winner: string }> => {
//   console.log(`fetching poll: ${poll.id}`)
//   let result: Record<string, number>[] = await getPollResults(poll.id)
//   const stringArray: string[] = result.map(record => {
//     const [option, count] = Object.entries(record)[0]
//     return `${option}: ${count}`
//   })
//   return {
//     type: "completed",
//     data:stringArray,
//   }
// }
// const fetchPollResults = async (poll: Poll): Promise<{ type: "completed" ;data: string[]; winner: string }> => {
//   const pollResults: Record<string, Record<string, number>> = {
//   }
//   const results = pollResults[poll.id] || {}
//   const formattedResults = Object.entries(results).map(([choice, votes]) => `${choice}: ${votes} votes`)

//   // Determine the winner by finding the option with the highest votes
//   const winner = Object.entries(results).reduce((max, entry) => (entry[1] > (results[max] || 0) ? entry[0] : max), "")
//   return {
//     type: "completed",
//     data: formattedResults,
//     winner: winner,
//   }
// }
const CompletedPollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClosedPolls().then(setPolls)
    setLoading(false)
  }, [])
  if (loading) {
    return (
     <LoadingBar></LoadingBar>
    )
  }
  return (
    <PollsDisplay 
      polls={polls} 
      onPollAction={fetchPollResults} 
      title="Completed Polls" 
      actionLabel="Poll Results"
    />
  )
}

export default CompletedPollsPage