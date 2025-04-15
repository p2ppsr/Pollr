// App.jsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Typography, Container, Button, Box, Grid } from '@mui/material'
import ActivePollsPage from './components/ActivePollsPage'
import CreatePollForm from './components/CreatePollForm'
import MyPollsPage from './components/MyPollsPage'
import CompletedPollsPage from './components/CompletePollsPage'
import PollDetailPage from './components/PollDetails'


function App() {
  return (
    <Router>
      <Container maxWidth="sm" style={{ marginTop: '2em' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Poll Management
        </Typography>

        <Box sx={{ margin: '2em 0' }}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={3}>
              <Button variant="contained" color="primary" fullWidth component={Link} to="/active-polls">
                Active Polls
              </Button>
            </Grid>
            <Grid item xs={3}>
              <Button variant="contained" color="primary" fullWidth component={Link} to="/create-poll">
                Create Poll
              </Button>
            </Grid>
            <Grid item xs={3}>
              <Button variant="contained" color="primary" fullWidth component={Link} to="/MyPolls">
                My Polls
              </Button>
            </Grid>
            <Grid item xs={3}>
              <Button variant="contained" color="primary" fullWidth component={Link} to="/CompletedPolls"  style={{ whiteSpace: 'nowrap' }}>
                Completed Polls
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Routes>
          <Route path="/active-polls" element={<ActivePollsPage />} />
          <Route path="/create-poll" element={<CreatePollForm />} />
          <Route path="/MyPolls" element={<MyPollsPage />} />
          <Route path="/CompletedPolls" element={<CompletedPollsPage />} />
          <Route path="/poll/:pollId" element={<PollDetailPage />} />
        </Routes>
      </Container>
    </Router>
  )
}

export default App