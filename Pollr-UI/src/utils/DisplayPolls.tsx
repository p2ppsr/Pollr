import { useState } from "react";
import { Button } from "@mui/material";
import "./DisplayPolls.css";
import {Poll} from "../types/types"


interface PollsListProps {
  polls: Poll[];
  onPollClick: (pollId: number) => void;
}

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
            key={poll.id}
            className="poll-row"
            onClick={() => onPollClick(poll.id)}
          >
            <td>{poll.id}</td>
            <td>{poll.name}</td>
            <td>{poll.desc}</td>
            <td>{poll.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

interface PollsDisplayProps {
  polls: Poll[];
  onPollAction: (pollId: number) => Promise<{ type: "vote" | "close" | "completed", data: string[], winner?: string }>;
  actionLabel: string;
  title: string;
}

export default function PollsDisplay({ polls, onPollAction, actionLabel, title }: PollsDisplayProps) {
  const [selectedPoll, setSelectedPoll] = useState<number | null>(null);
  const [actionData, setActionData] = useState<string[]>([]);
  const [actionType, setActionType] = useState<"vote" | "close" | "completed" | null>(null);
  const [winner, setWinner] = useState<string | null>(null);

  const handlePollClick = async (pollId: number) => {
    setSelectedPoll(pollId);
    const result = await onPollAction(pollId);
    setActionType(result.type);
    setActionData(result.data);
    if (result.type === "completed" && result.winner) {
      setWinner(result.winner);
    }
  };

  return (
    <div className="poll-container">
      <h1 className="poll-title">{title}</h1>
      {!selectedPoll ? (
        <PollsList polls={polls} onPollClick={handlePollClick} />
      ) : (
        <div>
          <h2 className="poll-choice-title">{actionLabel}</h2>
          {actionType === "vote" ? (
            actionData.length > 0 ? (
              actionData.map((choice, index) => (
                <div key={index} className="poll-card highlight-card" >
                  {choice}
                </div>
              ))
            ) : (
              <p>No choices available.</p>
            )
          ) : actionType === "completed" ? (
            <div>
              <h3>Final Poll Results:</h3>
              {actionData.length > 0 ? (
                actionData.map((result, index) => (
                  <div key={index} className={`poll-card ${result.includes(winner || "") ? "winner-highlight" : ""}`}>
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
              <Button className="close-button" onClick={() => alert("Poll closed!")}>Close Poll</Button>
            </div>
          )}
          <Button className="back-button" onClick={() => setSelectedPoll(null)}>Back</Button>
        </div>
      )}
    </div>
  );
}
