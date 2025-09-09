import { useState } from 'react'
import Dashboard from './components/Dashboard'
import TestPage from './components/TestPage'
import './App.css'

function App() {
  const [showTest, setShowTest] = useState(false)
  
  if (showTest) {
    return (
      <div>
        <button 
          onClick={() => setShowTest(false)}
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: '#ff4757',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '5px',
            cursor: 'pointer',
            zIndex: 1000
          }}
        >
          Back to Dashboard
        </button>
        <TestPage />
      </div>
    )
  }
  
  return (
    <div>
      <button 
        onClick={() => setShowTest(true)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: '#2ed573',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 1000
        }}
      >
        Test Mode
      </button>
      <Dashboard />
    </div>
  )
}

export default App