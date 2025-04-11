import React from "react"
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"
import { Typography, Container, Button, Box, Grid } from "@mui/material"
import ActivePollsPage from "./components/ActivePollsPage"
import CreatePoll from "./components/CreatePollForm"
import MyPolls from "./components/MyPollsPage"
import CompletedPolls from "./components/CompletePollsPage"
const App: React.FC = () => {
  return (
    <Router>
      <Container maxWidth="sm" style={{ marginTop: "2em" }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Poll Management
        </Typography>

        <Box sx={{ margin: "2em 0" }}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item>
              <Button variant="contained" color="primary" fullWidth component={Link} to="/active-polls">
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
          <Route path="/active-polls" element={<ActivePollsPage />} />
          <Route path="/create-poll" element={<CreatePoll />} />
          <Route path="/MyPolls" element={<MyPolls />} />
          <Route path="/CompletedPolls" element={<CompletedPolls />} />
          
        </Routes>
      </Container>
    </Router>
  )
}

export default App
