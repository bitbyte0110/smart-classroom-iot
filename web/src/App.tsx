import { useState } from 'react'
import Dashboard from './components/Dashboard'
import ClimateControl from './components/ClimateControl'
import './App.css'

type AppModule = 'lighting' | 'climate'

function App() {
  const [currentModule, setCurrentModule] = useState<AppModule>('lighting')
  
  return (
    <div>
      <nav className="module-navigation">
        <div className="nav-container">
          <div className="nav-brand">
            🏫 Smart Classroom
          </div>
          
          <div className="nav-tabs">
            <button 
              onClick={() => setCurrentModule('lighting')}
              className={`module-tab ${currentModule === 'lighting' ? 'active' : ''}`}
            >
              💡 Lighting Control
            </button>
            
            <button 
              onClick={() => setCurrentModule('climate')}
              className={`module-tab ${currentModule === 'climate' ? 'active' : ''}`}
            >
              🌡️ Climate Control
            </button>
          </div>
        </div>
      </nav>
      
      <div className="app-content">
        {currentModule === 'lighting' && <Dashboard />}
        {currentModule === 'climate' && <ClimateControl />}
      </div>
    </div>
  )
}

export default App