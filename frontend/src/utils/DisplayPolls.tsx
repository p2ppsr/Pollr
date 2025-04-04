import { useState } from "react"
import { Button } from "@mui/material"
import "./DisplayPolls.css"
import { Poll } from "../types/types"
import { Img } from "@bsv/uhrp-react"
import { submitVote, closePoll } from "./PollrActions"
import { styled } from '@mui/system'
import {LinearProgress} from '@mui/material'
interface PollsListProps {
  polls: Poll[]
  onPollClick: (poll: Poll) => void
}

const LoadingBar = styled(LinearProgress)({
  margin: '1em'
})
const PollsList: React.FC<PollsListProps> = ({ polls, onPollClick }) => {
  return (
    <table className="poll-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Poll Name</th>
          <th>Poll Description</th>
          <th>Date Created</th>
        </tr>
      </thead>
      <tbody>
        {polls.map((poll) => (
          <tr
            key={poll.date}
            className="poll-row"
            onClick={() => onPollClick(poll)}
          >
            <td>
              <Img
                src={poll.avatarUrl || ''}
                alt="Avatar"
                style={{ width: '100px', height: 'auto', marginRight: '10px' }}
              />
            </td>
            <td>{poll.name}</td>
            <td>{poll.desc}</td>
            <td>{new Date(Number(poll.date) * 1000).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface PollsDisplayProps {
  polls: Poll[]
  onPollAction: (
   poll:Poll,
    choice?: string
  ) => Promise<{ type: "open" | "close" | "completed"; data: string[]; winner?: string }>
  actionLabel: string
  title: string
}
export default function PollsDisplay({
  polls,
  onPollAction,
  actionLabel,
  title,
}: PollsDisplayProps) {
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null)
  const [actionData, setActionData] = useState<string[]>([])
  const [actionType, setActionType] = useState<"open" | "close" | "completed" | null>(null)
  const [winner, setWinner] = useState<string | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePollClick = async (poll: Poll) => {
    setLoading(true)
    setSelectedPoll(poll)
    setSelectedChoice(null) // Reset any previous selection
    const result = await onPollAction(poll)
    setActionType(result.type)
    setActionData(result.data)
    if (result.type === "completed" && result.winner) {
      setWinner(result.winner)
    }
    setLoading(false)
  }

  const handleConfirmVote = async () => {
    if (selectedPoll && selectedChoice) {
      // Extract only the part before the colon
      const voteOption = selectedChoice.split(":")[0].trim()
      submitVote({ poll: selectedPoll, index: voteOption })
    }
    // setTimeout(() => {
    //   if (selectedPoll)
    //     handlePollClick(selectedPoll)
    // }, 5000)//submit is stuck / clearning manually since submit does not return
  }

  // If data is being fetched, render only the loading bar
  if (loading) {
    return (
      <div className="poll-container">
        <LoadingBar />
      </div>
    )
  }

  return (
    <div className="poll-container">
      <h1 className="poll-title">{title}</h1>
      {!selectedPoll ? (
        <PollsList polls={polls} onPollClick={handlePollClick} />
      ) : (
        <div>
          <h2 className="poll-choice-title">{actionLabel}</h2>
          {actionType === "open" ? (
            actionData.length > 0 ? (
              <>
                {actionData.map((choice, index) => (
                  <div
                    key={index}
                    className={`poll-card highlight-card ${selectedChoice === choice ? "selected" : ""}`}
                    onClick={() => setSelectedChoice(choice)}
                  >
                    {choice}
                  </div>
                ))}
              </>
            ) : (
              <p>No choices available.</p>
            )
          ) : actionType === "completed" ? (
            <div>
              <h3>Final Poll Results:</h3>
              {actionData.length > 0 ? (
                actionData.map((result, index) => (
                  <div
                    key={index}
                    className={`poll-card ${result.includes(winner || "") ? "winner-highlight" : ""}`}
                  >
                    {result}
                  </div>
                ))
              ) : (
                <p>No results available.</p>
              )}
            </div>
          ) : (
            <div>
              <h3>Poll Results:</h3>
              {actionData.length > 0 ? (
                actionData.map((result, index) => (
                  <div key={index} className="poll-card">
                    {result}
                  </div>
                ))
              ) : (
                <p>No results available.</p>
              )}
              <Button className="close-button" onClick={() => closePoll({ pollId: selectedPoll.id })}>
                Close Poll
              </Button>
            </div>
          )}
          <div className="button-group">
            <Button className="back-button" onClick={() => setSelectedPoll(null)}>
              Back
            </Button>
            {actionType === "open" && selectedChoice && (
              <Button className="confirm-button" onClick={handleConfirmVote}>
                Confirm Vote
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
