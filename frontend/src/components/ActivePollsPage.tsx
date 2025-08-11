import React, { useEffect, useState } from "react"
import PollsList from "./PollsList"
import { Poll } from "../types/types"
import { fetchAllOpenPolls } from "../utils/PollrActions"
import { LinearProgress } from "@mui/material"
import { styled } from "@mui/system"
import { useUser } from "../../UserContext"

const LoadingBar = styled(LinearProgress)({
  margin: "1em",
})

const ActivePollsPage: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const { getClients, getAvatarCached } = useUser()

  useEffect(() => {
    fetchAllOpenPolls({ getClients, getAvatarCached }).then((data) => {
      setPolls(data as Poll[])
      setLoading(false)
    })
  }, [getClients, getAvatarCached])

  if (loading) return <LoadingBar />

  return <PollsList polls={polls} title="Active Polls" />
}

export default ActivePollsPage