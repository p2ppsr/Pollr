import React, { useState } from 'react'
import './PollForm.css'
import { submitCreatePolls } from '../utils/PollrActions'
import {Option} from '../types/types'


const PollForm: React.FC = () => {
  const [pollName, setPollName] = useState<string>('')
  const [pollDescription, setPollDescription] = useState<string>('')
  const [numberOfOptions, setNumberOfOptions] = useState<string>('2')
  const [optionsType, setOptionsType] = useState<'text' | 'image'>('text')
  const [options, setOptions] = useState<Option[]>([{ value: '' }, { value: '' }])
  const handleNumberOfOptionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNumberOfOptions(value)

    const count = parseInt(value, 10)
    if (!isNaN(count) && count >= 2 && count <= 10) {
      setOptions((prevOptions) => {
        const newOptions = [...prevOptions]
        if (count > prevOptions.length) {
          for (let i = prevOptions.length; i < count; i++) {
            newOptions.push({ value: '' })
          }
        } else {
          newOptions.length = count
        }
        return newOptions
      })
    }
  }

  const handleNumberOfOptionsBlur = () => {
    let count = parseInt(numberOfOptions, 10)
    if (isNaN(count) || count < 2) {
      count = 2
    } else if (count > 10) {
      count = 10
    }
    setNumberOfOptions(count.toString())
    setOptions((prevOptions) => {
      const newOptions = [...prevOptions]
      if (count > prevOptions.length) {
        for (let i = prevOptions.length; i < count; i++) {
          newOptions.push({ value: '' })
        }
      } else {
        newOptions.length = count
      }
      return newOptions
    })
  }

  const handleOptionValueChange = (index: number, value: string) => {
    const updatedOptions = [...options]
    updatedOptions[index].value = value
    setOptions(updatedOptions)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const count = parseInt(numberOfOptions, 10)
    if (isNaN(count) || count < 2 || count > 10) {
      alert('Please enter a valid number of options (between 2 and 10).')
      return
    }

    const optionValues = options.map(option => option.value.trim())
    const uniqueValues = new Set(optionValues)
    if (optionValues.some(value => value === '')) {
      alert('Options cannot be empty or contain only spaces.')
      return
    }
    if (uniqueValues.size !== optionValues.length) {
      alert('Duplicate options are not allowed. Please enter unique values.')
      return
    }

    submitCreatePolls({
      pollName,
      pollDescription,
      optionsType,
      options,
    })
    // setTimeout(() => {
    //     window.location.reload()
    //   }, 5000)
    console.log({
      pollName,
      pollDescription,
      optionsType,
      options,
    })
  }

  return (
    <form className="poll-form" onSubmit={handleSubmit}>
      <h2>Create a Poll</h2>

      <div className="form-group">
        <label>Poll Name:</label>
        <input
          type="text"
          value={pollName}
          onChange={(e) => setPollName(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Poll Description:</label>
        <textarea
          value={pollDescription}
          onChange={(e) => setPollDescription(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Options Type:</label>
        <select
          value={optionsType}
          onChange={(e) => setOptionsType(e.target.value as 'text' | 'image')}
        >
          <option value="text">Text</option>
          <option value="image">Image</option>
        </select>
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

      {options.map((option, index) => (
        <div className="form-group" key={index}>
          <label>{`Option ${index + 1} (${optionsType}):`}</label>
          {optionsType === 'text' ? (
            <input
              type="text"
              value={option.value}
              onChange={(e) => handleOptionValueChange(index, e.target.value)}
              required
            />
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleOptionValueChange(index, URL.createObjectURL(e.target.files[0]))
                }
              }}
              required
            />
          )}
        </div>
      ))}

      <button type="submit" className="submit-button">
        Create Poll
      </button>
    </form>
  )
}

export default PollForm
