import React from 'react';
import { Typography, Container, Button, Box, Grid } from '@mui/material';

const App: React.FC = () => {
  return (
    <Container maxWidth="sm" style={{ marginTop: '2em' }}>
      {/* Main Title */}
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Poll Management
      </Typography>

      {/* Navigation Buttons */}
      <Box sx={{ marginTop: '2em' }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Button variant="contained" color="primary" fullWidth>
              Active Polls
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" fullWidth>
              Create Poll
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" fullWidth>
              Vote
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" fullWidth>
              My Polls
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" fullWidth>
              Close Poll
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" fullWidth>
              Completed Polls
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default App;