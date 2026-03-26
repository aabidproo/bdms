import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    axios.get('http://localhost:5001/')
      .then(response => {
        setMessage(response.data.message)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
        setMessage('Error connecting to backend')
      })
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>Blood Donation Management System</h1>
        <p>Hello World!</p>
        <p>Backend response: {message}</p>
      </header>
    </div>
  )
}

export default App
