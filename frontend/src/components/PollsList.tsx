import "./PollsList.css"
import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Img } from "@bsv/uhrp-react"
import { Poll } from "../types/types"
import { Typography } from "@mui/material"

interface PollsListProps {
  polls: Poll[]
  title: string
}

const PollsList: React.FC<PollsListProps> = ({ polls, title }) => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")

  const filteredPolls = polls.filter(
    (poll) =>
      poll.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poll.desc.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="poll-container">
      <Typography variant="h5" align="center" className="poll-title">
        {title}
      </Typography>
      <div className="search-bar-container">
        <input
          type="text"
          placeholder="Search polls..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
        />
      </div>
      <table className="poll-table">
        <thead>
          <tr>
            <th>Creator</th>
            <th>Poll Name</th>
            <th>Poll Description</th>
            <th>Date Created</th>
          </tr>
        </thead>
        <tbody>
          {filteredPolls.map((poll) => (
            <tr
              key={poll.id}
              className="poll-row"
              onClick={() => navigate(`/poll/${poll.id}`)}
            >
              <td>
                <Img
                  src={poll.avatarUrl || ""}
                  alt="Avatar"
                  style={{
                    width: "48px",
                    height: "48px",
                    objectFit: "cover",
                    borderRadius: "50%",
                    display: "block"
                  }}
                />

              </td>
              <td>{poll.name}</td>
              <td>{poll.desc}</td>
              <td>{new Date(Number(poll.date) * 1000).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PollsList