import React, { useEffect, useState } from "react"
import PollsDisplay from "../utils/DisplayPolls"
import { Poll } from "../types/types"

const fetchCompletedPolls = async (): Promise<Poll[]> => {
  return [
   
  ]
}

const fetchPollResults = async (pollId: number): Promise<{ type: "completed" ;data: string[]; winner: string }> => {
  const pollResults: Record<number, Record<string, number>> = {

  }

  const results = pollResults[pollId] || {}
  const formattedResults = Object.entries(results).map(([choice, votes]) => `${choice}: ${votes} votes`)

  // Determine the winner by finding the option with the highest votes
  const winner = Object.entries(results).reduce((max, entry) => (entry[1] > (results[max] || 0) ? entry[0] : max), "")
  return {
    type: "completed",
    data: formattedResults,
    winner: winner,
  }
}
// export const vote = async (pollId: number): Promise<{ type: "open"; data: string[] }> => {
//   let result: Record<string, number>[] = await fetchopenvotes(pollId.toString())
//   const stringArray: string[] = result.map(record => {
//     // Each record is assumed to have a single key-value pair.
//     const [option, count] = Object.entries(record)[0]
//     return `${option}: ${count}`
//   })
//   return {
//     type: "open",
//     data:stringArray,
//   }
// }
const CompletedPollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([])

  useEffect(() => {
    fetchCompletedPolls().then(setPolls)
  }, [])

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