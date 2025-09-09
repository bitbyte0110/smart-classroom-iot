import { useState } from 'react'
import LightingModule from './components/LightingModule'
import ClimateModule from './components/ClimateModule'
import TestPage from './components/TestPage'
import './App.css'

type ModuleType = 'lighting' | 'climate' | 'test';

function App() {
  const [activeModule, setActiveModule] = useState<ModuleType>('lighting')
  
  const renderModule = () => {
    switch (activeModule) {
      case 'lighting':
        return <LightingModule />
      case 'climate':
        return <ClimateModule />
      case 'test':
        return <TestPage />
      default:
        return <LightingModule />
    }
  }
  
  return (
    <div className="app">
      <nav className="app-nav">
        <div className="app-nav-brand">
          <h1>🏫 Smart Classroom Control System</h1>
        </div>
        <div className="app-nav-modules">
          <button 
            className={activeModule === 'lighting' ? 'active' : ''}
            onClick={() => setActiveModule('lighting')}
          >
            💡 Lighting
          </button>
          <button 
            className={activeModule === 'climate' ? 'active' : ''}
            onClick={() => setActiveModule('climate')}
          >
            🌡️ Climate
          </button>
          <button 
            className={activeModule === 'test' ? 'active' : ''}
            onClick={() => setActiveModule('test')}
          >
            🧪 Test Mode
          </button>
        </div>
      </nav>

      <main className="app-main">
        {renderModule()}
      </main>
    </div>
  )
}

export default App