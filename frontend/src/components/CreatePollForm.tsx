import "./PollForm.css"
import React, { useState } from "react"
import { submitCreatePolls } from "../utils/PollrActions"
import { Option } from "../types/types"
import { styled } from "@mui/system"
import { LinearProgress } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { StorageUploader,WalletClient } from "@bsv/sdk"

const LoadingBar = styled(LinearProgress)({
  margin: "1em"
})

const STORAGE_URL = "https://nanostore.babbage.systems"
const HOSTING_MINUTES = 525600 // Default: ~1 year

const CreatePollForm: React.FC = () => {
  const [pollName, setPollName] = useState<string>("")
  const [pollDescription, setPollDescription] = useState<string>("")
  const [numberOfOptions, setNumberOfOptions] = useState<string>("2")
  const [optionsType, setOptionsType] = useState<"text" | "UHRP" | "UHRPlink">("text")
  const [options, setOptions] = useState<Option[]>([{ value: "" }, { value: "" }])
  const [optionFiles, setOptionFiles] = useState<(File | null)[]>([null, null])
  const [loading, setLoading] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const navigate = useNavigate()

  const handleNumberOfOptionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNumberOfOptions(value)
    const count = parseInt(value, 10)
    if (!isNaN(count) && count >= 2 && count <= 10) {
      setOptions(prev => {
        const newOptions = [...prev]
        if (count > prev.length) {
          for (let i = prev.length; i < count; i++) {
            newOptions.push({ value: "" })
          }
        } else {
          newOptions.length = count
        }
        return newOptions
      })
      if (optionsType !== "text") {
        setOptionFiles(prev => {
          const newFiles = [...prev]
          if (count > prev.length) {
            for (let i = prev.length; i < count; i++) {
              newFiles.push(null)
            }
          } else {
            newFiles.length = count
          }
          return newFiles
        })
      }
    }
  }

  const handleNumberOfOptionsBlur = () => {
    let count = parseInt(numberOfOptions, 10)
    if (isNaN(count) || count < 2)
      count = 2
    else if (count > 10)
      count = 10
    setNumberOfOptions(count.toString())
    setOptions(prev => {
      const newOptions = [...prev]
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          newOptions.push({ value: "" })
        }
      } else {
        newOptions.length = count
      }
      return newOptions
    })
    if (optionsType !== "text") {
      setOptionFiles(prev => {
        const newFiles = [...prev]
        if (count > prev.length) {
          for (let i = prev.length; i < count; i++) {
            newFiles.push(null)
          }
        } else {
          newFiles.length = count
        }
        return newFiles
      })
    }
  }

  const handleOptionValueChange = (index: number, value: string) => {
    const updatedOptions = [...options]
    updatedOptions[index].value = value
    setOptions(updatedOptions)
  }

  const handleOptionFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null
    setOptionFiles(prev => {
      const newFiles = [...prev]
      newFiles[index] = file
      return newFiles
    })
  }

  const uploadFileToStorage = async (file: File) => {
    try {
      const wallet = new WalletClient()
      const storageUploader = new StorageUploader({
        storageURL: STORAGE_URL,
        wallet
      })

      // Read file into an ArrayBuffer
      const fileArrayBuffer = await file.arrayBuffer()
      if (!fileArrayBuffer) {
        throw new Error("Could not read file array buffer.")
      }
      
      // Turn the array buffer into a normal number array
      const data = Array.from(new Uint8Array(fileArrayBuffer))
      const uploadableFile = { data, size: data.length, type: file.type }

      // Publish the file using the StorageUploader
      const uploadResult = await storageUploader.publishFile({
        file: uploadableFile,
        retentionPeriod: HOSTING_MINUTES
      })

      return uploadResult.uhrpURL
    } catch (error) {
      console.error("Error uploading file:", error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const count = parseInt(numberOfOptions, 10)
    if (isNaN(count) || count < 2 || count > 10) {
      alert("Please enter a valid number of options (between 2 and 10).")
      return
    }
    
    // Validate options based on type
    if (optionsType === "text") {
      const optionValues = options.map(opt => opt.value.trim())
      if (optionValues.some(val => val === "")) {
        alert("Options cannot be empty or contain only spaces.")
        return
      }
      if (new Set(optionValues).size !== optionValues.length) {
        alert("Duplicate options are not allowed. Please enter unique values.")
        return
      }
    } else if (optionsType === "UHRP") {
      for (let i = 0; i < options.length; i++) {
        if (!optionFiles[i]) {
          alert(`Please select an image for option ${i + 1}.`)
          return
        }
      }
    } else if (optionsType === "UHRPlink") {
      const optionValues = options.map(opt => opt.value.trim())
      if (optionValues.some(val => val === "")) {
        alert("Please fill every option with a UHRP link.")
        return
      }
    }

    setLoading(true)
    
    try {
      if (optionsType === "UHRP") {
        const updatedOptions = [...options]
        
        for (let i = 0; i < optionFiles.length; i++) {
          const file = optionFiles[i]
          if (file) {
            try {
              setUploadProgress(Math.round((i / optionFiles.length) * 50))
              
              const uhrpURL = await uploadFileToStorage(file)
              
              updatedOptions[i].value = uhrpURL
            } catch (error) {
              console.error(`Error uploading file for option ${i + 1}:`, error)
              alert(`Failed to upload image for option ${i + 1}. Please try again.`)
              setLoading(false)
              return
            }
          }
        }
        
        setOptions(updatedOptions)
      }

      const optionValues = options.map(opt => opt.value.trim())
      if (optionValues.some(val => val === "") || new Set(optionValues).size !== optionValues.length) {
        alert("Please ensure all options are valid and unique.")
        setLoading(false)
        return
      }

      const createdPoll = await submitCreatePolls({
        pollName,
        pollDescription,
        optionsType,
        options: options.map(opt => ({ value: opt.value.trim() }))
      })
      
      setUploadProgress(100)
      alert("Poll Successfully Created!")
      navigate(`/poll/${createdPoll}`)
      
      setPollName("")
      setPollDescription("")
      setNumberOfOptions("2")
      setOptions([{ value: "" }, { value: "" }])
      setOptionFiles([null, null])
      
    } catch (error) {
      console.error("Error submitting poll:", error)
      alert("Error submitting poll")
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <form className="poll-form" onSubmit={handleSubmit}>
      <h2>Create a Poll</h2>
      <div className="form-group">
        <label>Poll Name:</label>
        <input
          type="text"
          value={pollName}
          onChange={e => setPollName(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Poll Description:</label>
        <textarea
          value={pollDescription}
          onChange={e => setPollDescription(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Number of Options:</label>
        <input
          type="number"
          value={numberOfOptions}
          onChange={handleNumberOfOptionsChange}
          onBlur={handleNumberOfOptionsBlur}
          min="2"
          max="10"
          required
        />
      </div>
      <div className="form-group">
        <label>Options Type:</label>
        <select
          value={optionsType}
          onChange={e => setOptionsType(e.target.value as "text" | "UHRP" | "UHRPlink")}
        >
          <option value="text">Text</option>
          <option value="UHRP">UHRP (Upload Image)</option>
          <option value="UHRPlink">UHRP Link</option>
        </select>
      </div>
      {options.map((option, index) => (
        <div className="form-group" key={index}>
          <label>
            {`Option ${index + 1} (${
              optionsType === "text"
                ? "Text"
                : optionsType === "UHRP"
                ? "Image Upload"
                : "UHRP Link"
            }) :`}
          </label>
          {optionsType === "text" ? (
            <input
              type="text"
              value={option.value}
              onChange={e => handleOptionValueChange(index, e.target.value)}
              required
            />
          ) : optionsType === "UHRPlink" ? (
            <input
              type="text"               
              placeholder="XUUVZqvzYskUvEXAMPLE-UHRPoAUojQcxDr6hTUwEz1vPLdvc64z"
              value={option.value}
              onChange={e => handleOptionValueChange(index, e.target.value)}
              required
            />
          ) : (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={e => handleOptionFileChange(index, e)}
                required
              />
              {optionFiles[index] && (
                <p style={{ color: "black" }}>Selected file: {optionFiles[index]?.name}</p>
              )}
            </div>
          )}
        </div>
      ))}
      
      {loading && (
        <div className="progress-container">
          <LinearProgress 
            variant={uploadProgress === 0 ? "indeterminate" : "determinate"} 
            value={uploadProgress}
            sx={{ height: 6, borderRadius: 3, margin: "1em 0" }}
          />
          <p>Uploading files and creating poll...</p>
        </div>
      )}
      
      <button type="submit" className="submit-button" disabled={loading}>
        Create Poll
      </button>
    </form>
  )
}

export default CreatePollForm