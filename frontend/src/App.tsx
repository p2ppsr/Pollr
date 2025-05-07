import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Pollr from 'pollr-react'
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Typography
} from '@mui/material'
import './App.scss';

const darkTheme = createTheme({ palette: { mode: 'dark' } })

const App: React.FC = () => (
  <ThemeProvider theme={darkTheme}>
    <CssBaseline />
    <BrowserRouter>
      <Container
        maxWidth="md"
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0,
        }}
      >
        <Box
          component="header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 4,
            userSelect: 'none',
          }}
        >
          <Box
            component="img"
            src="/pollr-logo-white.svg"
            alt="Pollr logo"
            sx={{ width: 48, height: 48, mr: 1 }}
            aria-label="Pollr logo"
            tabIndex={0}
          />
          <Typography
            variant="h1"
            component="h1"
            sx={{ fontSize: '2.5rem', fontWeight: 700 }}
          >
            Pollr
          </Typography>
        </Box>
        <Pollr initialPath="/" />
      </Container>
    </BrowserRouter>
  </ThemeProvider>
)

export default App
