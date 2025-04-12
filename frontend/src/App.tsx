import React, { useState, useEffect} from "react"
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"
import { Typography, Container, Button, Box, Grid } from "@mui/material"
import ActivePollsPage from "./components/ActivePollsPage"
import CreatePoll from "./components/CreatePollForm"
import MyPolls from "./components/MyPollsPage"
import CompletedPolls from "./components/CompletePollsPage"
import checkForMetaNetClient from './utils/checkForMetaNetClient'
import NoMncModal from './components/NoMncModal'

const App: React.FC = () => {
  const [isMncMissing, setIsMncMissing] = useState<boolean>(false)

  useEffect(() => {
    const intervalId = setInterval(() => {
      checkForMetaNetClient().then(hasMNC => {
        if (hasMNC === 0) {
          setIsMncMissing(true) // Open modal if MNC is not found
        } else {
          setIsMncMissing(false) // Ensure modal is closed if MNC is found
          clearInterval(intervalId)
        }
      }).catch(error => {
        console.error('Error checking for MetaNet Client:', error)
      })
    }, 1000)
    // Return a cleanup function
    return () => {
      clearInterval(intervalId)
    }
  }, [])

  return (
    <Router>
      <Container maxWidth="sm" style={{ marginTop: "2em" }}>
      <NoMncModal open={isMncMissing} onClose={() => { setIsMncMissing(false) }} />
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Pollr
        </Typography>

        <Box sx={{ margin: "2em 0" }}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item>
              <Button variant="contained" color="primary" fullWidth component={Link} to="/">
                Active Polls
              </Button>
            </Grid>
            <Grid item>
              <Button variant="contained" color="primary" fullWidth component={Link} to="/create-poll">
                Create Poll
              </Button>
            </Grid>
            <Grid item>
              <Button variant="contained" color="primary" fullWidth component={Link} to="/MyPolls">
                My Polls
              </Button>
            </Grid>
            <Grid item>
              <Button variant="contained" color="primary" fullWidth component={Link} to="/CompletedPolls">
                Completed Polls
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Routes>
          <Route path="/" element={<ActivePollsPage />} />
          <Route path="/create-poll" element={<CreatePoll />} />
          <Route path="/MyPolls" element={<MyPolls />} />
          <Route path="/CompletedPolls" element={<CompletedPolls />} />

        </Routes>
      </Container>
    </Router>
  )
}

export default App
