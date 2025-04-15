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
import { WalletClient } from '@bsv/sdk'

import { Button, LinearProgress } from "@mui/material"
import { styled } from "@mui/system"
import "./PollDetails.css"

const LoadingBar = styled(LinearProgress)({
  margin: "1em",
})
const walletClient = new WalletClient()
const PollDetailPage: React.FC = () => {
  const { pollId } = useParams<{ pollId: string }>()
  const navigate = useNavigate()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<string[]>([])
  const [actionType, setActionType] = useState<"open" | "completed" | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("")

  // Retrieve current user ID from walletClient on mount
  useEffect(() => {
    walletClient
      .getPublicKey({ identityKey: true })
      .then((result) => {
        setCurrentUserId(result.publicKey)
      })
      .catch((error) => {
        console.error("Error fetching current user public key", error)
      })
  }, [])

  useEffect(() => {
    if (!pollId) return
    setLoading(true)
    Promise.all([fetchAllOpenPolls(), getClosedPolls()])
      .then(([openPolls, closedPolls]) => {
        const foundPoll =
          openPolls.find((p) => p.id === pollId) ||
          closedPolls.find((p) => p.id === pollId)
        if (!foundPoll) {
          throw new Error("Poll not found")
        }
        setPoll(foundPoll)
        if (foundPoll.status === "open") {
          setActionType("open")
          return fetchOpenVotes(foundPoll.id).then((votes) => {
            const voteStrings = votes.map((record) => {
              const [option, count] = Object.entries(record)[0]
              return `${option}: ${count}`
            })
            setResults(voteStrings)
          })
        } else if (foundPoll.status === "closed") {
          setActionType("completed")
          console.log(`foundid: ${foundPoll.id}`)
          return getPollResults(foundPoll.id).then((res) => {
            let resultStrings: string[] = []
            console.log(`${JSON.stringify(res)}`)
            // If the response is an array with a single aggregated object with multiple keys
            if (res.length === 1 && typeof res[0] === "object" && Object.keys(res[0]).length > 1) {
              resultStrings = Object.entries(res[0]).map(
                ([option, count]) => `${option}: ${count}`
              )
            } else {
              // Otherwise, assume each record is a separate key/value pair
              resultStrings = res.map((record) => {
                const [option, count] = Object.entries(record)[0]
                return `${option}: ${count}`
              })
            }
            setResults(resultStrings)
          })
        }
      })
      .catch((error) => {
        console.error("Error loading poll", error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [pollId])

  if (loading || !poll) {
    return <LoadingBar />
  }

  // Determine ownership
  const isOwner = poll.key === currentUserId

  // Conditionally set header and subheader text based on context
  let headerText = "Active Polls"
  let subheaderText = "Vote for your choice"
  if (actionType === "completed") {
    headerText = "Completed Polls"
    subheaderText = "Final Votes"
  } else if (actionType === "open" && isOwner) {
    headerText = "My Polls"
    subheaderText = "Close Poll"
  }

  // Handle vote submission for open polls.
  const handleConfirmVote = async () => {
    if (!selectedChoice || !poll) return
    setLoading(true)
    try {
      const voteOption = selectedChoice.split(":")[0].trim()
      await submitVote({ poll, index: voteOption })
      if (poll.status === "open") {
        const votes = await fetchOpenVotes(poll.id)
        const voteStrings = votes.map((record) => {
          const [option, count] = Object.entries(record)[0]
          return `${option}: ${count}`
        })
        setResults(voteStrings)
      }
      alert("Vote Success!")
    } catch (error: any) {
      alert("Error submitting vote. Duplicate votes may not be allowed.")
    } finally {
      setLoading(false)
    }
  }

  // Handle closing the poll.
  const handleClosePoll = async () => {
    if (!poll) return
    setLoading(true)
    try {
      await closePoll({ pollId: poll.id })
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
      {/* Render header and subheader based on context */}
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
            {results.map((result, index) => (
              <div
                key={index}
                className="poll-card"  // or a dedicated class for completed results
              >
                {result}
              </div>
            ))}
          </div>
        ) : (
          <div className="poll-options">
            {results.map((result, index) => (
              <div
                key={index}
                className={`poll-option ${selectedChoice === result ? "selected" : ""}`}
                onClick={() => setSelectedChoice(result)}
              >
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="button-group">
        <Button className="button-back" variant="contained" onClick={() => navigate(-1)}>
          Back
        </Button>
        {actionType === "open" && selectedChoice && (
          <Button className="button-vote" variant="contained" onClick={handleConfirmVote}>
            Vote
          </Button>
        )}
        {isOwner && actionType === "open" && (
          <Button className="button-close" variant="contained" onClick={handleClosePoll}>
            Close Poll
          </Button>
        )}
      </div>
    </div>
  )
}

export default PollDetailPage