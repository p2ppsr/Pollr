import React, { useEffect, useState } from "react"
import PollsList from "./PollsList"
import { Poll } from "../types/types"
import { getClosedPolls } from "../utils/PollrActions"
import { LinearProgress } from "@mui/material"
import { styled } from "@mui/system"

const LoadingBar = styled(LinearProgress)({
  margin: "1em",
})

const CompletedPollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClosedPolls().then((data) => {
      setPolls(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingBar />

  return <PollsList polls={polls} title="Completed Polls" />
}

export default CompletedPollsPage