import "./PollDetails.css"
import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Poll } from "../types/types"
import {
  fetchAllOpenPolls,
  getClosedPolls,
  fetchOpenVotes,
  getPollResults,
  submitVote,
  closePoll,
} from "../utils/PollrActions"
import { Img } from "@bsv/uhrp-react"
import { useUser } from "../../UserContext"

import { Button, LinearProgress } from "@mui/material"
import { styled } from "@mui/system"

const LoadingBar = styled(LinearProgress)({
  margin: "1em",
})

const PollDetailPage: React.FC = () => {
  const { pollId } = useParams<{ pollId: string }>()
  const navigate = useNavigate()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<string[]>([])
  const [actionType, setActionType] = useState<"open" | "completed" | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const { getClients, getAvatarCached, userId } = useUser()

  useEffect(() => {
    if (!pollId) return
    setLoading(true)
    Promise.all([fetchAllOpenPolls({ getClients, getAvatarCached }), getClosedPolls({ getClients, getAvatarCached })])
      .then(([openPolls, closedPolls]) => {
        const found =
          openPolls.find((p) => p.id === pollId) ||
          closedPolls.find((p) => p.id === pollId)
        if (!found) throw new Error("Poll not found")
        setPoll(found)
        if (found.status === "open") {
          setActionType("open")
          return fetchOpenVotes(found.id, { getClients, getAvatarCached }).then((votes) =>
            setResults(
              votes.map((r) => {
                const [opt, cnt] = Object.entries(r)[0]
                return `${opt}: ${cnt}`
              })
            )
          )
        } else {
          setActionType("completed")
          return getPollResults(found.id, { getClients, getAvatarCached }).then((res) =>
            setResults(
              res.map((r) => {
                const [opt, cnt] = Object.entries(r)[0]
                return `${opt}: ${cnt}`
              })
            )
          )
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [pollId, getClients, getAvatarCached])

  if (loading || !poll) return <LoadingBar />

  const isOwner = poll.key === (userId ?? "")
  const headerText = actionType === "completed" ? "Closed Poll" : "Active Poll"
  const subheaderText = actionType === "completed" ? "Final Results" : "Interim Results"

  const handleConfirmVote = async () => {
    if (!selectedChoice) return
    setLoading(true)
    try {
      const voteOption = selectedChoice.split(":")[0].trim()
      await submitVote({ poll, index: voteOption }, { getClients, getAvatarCached })
      const fresh = await fetchOpenVotes(poll.id, { getClients, getAvatarCached })
      setResults(
        fresh.map((r) => {
          const [opt, cnt] = Object.entries(r)[0]
          return `${opt}: ${cnt}`
        })
      )
      alert("Vote Success!")
    } catch {
      alert("Error submitting vote. Duplicate votes may not be allowed.")
    } finally {
      setLoading(false)
    }
  }

  const handleClosePoll = async () => {
    setLoading(true)
    try {
      await closePoll({ pollId: poll.id }, { getClients, getAvatarCached })
      alert("Poll Closed")
      navigate(-1)
    } catch {
      alert("Error closing poll.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="poll-detail-container">
      <div className="poll-detail-header">
        <h1>{headerText}</h1>
      </div>
      <div className="poll-detail-subheader">{subheaderText}</div>

      <div className="poll-detail-label">Poll name:</div>
      <div className="poll-detail-content">{poll.name}</div>
      <div className="poll-detail-label">Description:</div>
      <div className="poll-detail-content">{poll.desc}</div>

      <div className="poll-options">
        {actionType === "completed" ? (
          <div>
            <h3>Final Poll Results:</h3>
            {results.map((result, i) => {
              const [opt, cnt] = result.split(":")
              return (
                <div
                  key={i}
                  className={`poll-card ${selectedChoice === result ? "selected" : ""}`}
                  onClick={() => setSelectedChoice(result)}
                >
                  {poll.optionstype === "UHRP" ? (
                    <>
                      <Img src={opt.trim()} style={{ width: '150px', height: '150px', objectFit: 'cover' }} />
                      <div>{cnt?.trim() || "0"}</div>
                    </>
                  ) : (
                    result
                  )}
                </div>
              )
            })}

          </div>
        ) : (
          <div className="poll-options">
            {results.map((result, i) => {
              const [opt, cnt] = result.split(":")
              return (
                <div
                  key={i}
                  className={`poll-option ${selectedChoice === result ? "selected" : ""}`}
                  onClick={() => setSelectedChoice(result)}
                >
                  {poll.optionstype === "UHRP" ? (
                    <>
                      <Img src={opt.trim()} style={{ width: '150px', height: '150px', objectFit: 'cover' }} />
                      <div>{cnt?.trim() || "0"}</div>
                    </>
                  ) : (
                    result
                  )}
                </div>
              )
            })}

          </div>
        )}
      </div>

      <div className="button-group">
        <Button variant="contained" onClick={() => navigate(-1)}>
          Back
        </Button>
        {actionType === "open" && selectedChoice && (
          <Button variant="contained" onClick={handleConfirmVote}>
            Vote
          </Button>
        )}
        {isOwner && actionType === "open" && (
          <Button variant="contained" onClick={handleClosePoll}>
            Close Poll
          </Button>
        )}
      </div>
    </div>
  )
}

export default PollDetailPage
