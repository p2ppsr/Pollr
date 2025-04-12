import React from 'react'
import { Modal, Box, Typography, Button, IconButton } from '@mui/material'
import './NoMncModal.css'

const style = {
  position: 'absolute',
  top: '40%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 500 },
  bgcolor: 'background.paper',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  p: 4,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',
  color: 'white',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #40E0D0, #00CED1)',
  }
}

interface NoMncModalProps {
  open: boolean
  onClose: () => void
}

const NoMncModal: React.FC<NoMncModalProps> = ({ open, onClose }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'
      closeAfterTransition
    >
      <Box sx={style} className='focusBorderNone'>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              color: 'white',
            }
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </IconButton>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            bgcolor: 'rgba(64, 224, 208, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#40E0D0"/>
              <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" fill="#40E0D0"/>
            </svg>
          </Box>
          <Typography id='modal-modal-title' variant='h5' component='h2' sx={{ fontWeight: 'bold', color: 'white' }}>
            MetaNet Client Required
          </Typography>
        </Box>
        
        <Typography id='modal-modal-description' sx={{ mt: 2, mb: 3, lineHeight: 1.6 }}>
          Pollr requires the MetaNet Client to function properly. If you don&apos;t have it yet, you can download it for your platform:
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
          <Button 
            variant="outlined" 
            href='https://metanet.bsvb.tech/'
            target='_blank'
            rel='noopener noreferrer'
            sx={{ 
              borderColor: 'rgba(64, 224, 208, 0.5)',
              color: 'white',
              '&:hover': {
                borderColor: '#40E0D0',
                bgcolor: 'rgba(64, 224, 208, 0.1)',
              },
              justifyContent: 'flex-start',
              py: 1.5
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '12px' }}>
              <path d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 4L12 16" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 8L12 4L16 8" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download for Windows
          </Button>
          
          <Button 
            variant="outlined" 
            href='https://metanet.bsvb.tech/'
            target='_blank'
            rel='noopener noreferrer'
            sx={{ 
              borderColor: 'rgba(64, 224, 208, 0.5)',
              color: 'white',
              '&:hover': {
                borderColor: '#40E0D0',
                bgcolor: 'rgba(64, 224, 208, 0.1)',
              },
              justifyContent: 'flex-start',
              py: 1.5
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '12px' }}>
              <path d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 4L12 16" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 8L12 4L16 8" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download for macOS
          </Button>
          
          <Button 
            variant="outlined" 
            href='https://metanet.bsvb.tech/'
            target='_blank'
            rel='noopener noreferrer'
            sx={{ 
              borderColor: 'rgba(64, 224, 208, 0.5)',
              color: 'white',
              '&:hover': {
                borderColor: '#40E0D0',
                bgcolor: 'rgba(64, 224, 208, 0.1)',
              },
              justifyContent: 'flex-start',
              py: 1.5
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '12px' }}>
              <path d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 4L12 16" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 8L12 4L16 8" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download for Linux
          </Button>
        </Box>
        
        <Button 
          variant="contained" 
          onClick={onClose}
          sx={{ 
            bgcolor: 'rgba(64, 224, 208, 0.2)',
            color: '#40E0D0',
            '&:hover': {
              bgcolor: 'rgba(64, 224, 208, 0.3)',
            },
            width: '100%',
            py: 1.5
          }}
        >
          Close
        </Button>
      </Box>
    </Modal>
  )
}

export default NoMncModal
