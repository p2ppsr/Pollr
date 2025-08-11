import React, { useEffect, useState } from "react"
import PollsList from "./PollsList"
import { Poll } from "../types/types"
import { getClosedPolls } from "../utils/PollrActions"
import { LinearProgress } from "@mui/material"
import { styled } from "@mui/system"
import { useUser } from "../../UserContext"

const LoadingBar = styled(LinearProgress)({
  margin: "1em",
})

const CompletedPollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const { getClients, getAvatarCached } = useUser()

  useEffect(() => {
    getClosedPolls({ getClients, getAvatarCached }).then((data) => {
      setPolls(data)
      setLoading(false)
    })
  }, [getClients, getAvatarCached])

  if (loading) return <LoadingBar />

  return <PollsList polls={polls} title="Completed Polls" />
}

export default CompletedPollsPage