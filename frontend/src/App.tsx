// src/App.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Pollr from 'pollr-react'
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container
} from '@mui/material'

// Create a dark‐mode MUI theme
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
          alignItems: 'center',
          justifyContent: 'center',
          p: 0,
        }}
      >
        <Pollr initialPath="/" />
      </Container>
    </BrowserRouter>
  </ThemeProvider>
)

export default App
