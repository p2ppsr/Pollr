import React, { useEffect, useState } from "react"
import PollsList from "./PollsList"
import { Poll } from "../types/types"
import { fetchMypolls } from "../utils/PollrActions"
import { LinearProgress } from "@mui/material"
import { styled } from "@mui/system"

const LoadingBar = styled(LinearProgress)({
  margin: "1em",
})

const MyPollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMypolls().then((data) => {
      setPolls(data as Poll[])
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingBar />

  return <PollsList polls={polls} title="My Polls" />
}

export default MyPollsPage