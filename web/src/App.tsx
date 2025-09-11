import { useState } from 'react'
import Dashboard from './components/Dashboard'
import ClimateControl from './components/ClimateControl'
import './App.css'

type AppModule = 'lighting' | 'climate'

function App() {
  const [currentModule, setCurrentModule] = useState<AppModule>('lighting')
  
  return (
    <div>
      <nav style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        background: 'rgba(0,0,0,0.9)',
        padding: '0.5rem 1rem',
        display: 'flex',
        gap: '1rem',
        zIndex: 1000,
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button 
          onClick={() => setCurrentModule('lighting')}
          style={{
            background: currentModule === 'lighting' ? '#4CAF50' : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          💡 Lighting Control
        </button>
        <button 
          onClick={() => setCurrentModule('climate')}
          style={{
            background: currentModule === 'climate' ? '#4CAF50' : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🌡️ Climate Control
        </button>
      </nav>
      
      <div style={{ paddingTop: '60px' }}>
        {currentModule === 'lighting' && <Dashboard />}
        {currentModule === 'climate' && <ClimateControl />}
      </div>
    </div>
  )
}

export default App