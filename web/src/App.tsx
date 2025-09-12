import { useState } from 'react'
import Dashboard from './components/Dashboard'
import ClimateControl from './components/ClimateControl'
import FirebaseTest from './components/FirebaseTest'
import SimpleTest from './components/SimpleTest'
import './App.css'

type AppModule = 'lighting' | 'climate' | 'test' | 'simple'

function App() {
  const [currentModule, setCurrentModule] = useState<AppModule>('lighting')
  
  return (
    <div>
      <nav className="module-navigation">
        <div className="nav-container">
          <div className="nav-brand">
            🏫 Smart Classroom
          </div>
          
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
          
          <button 
            onClick={() => setCurrentModule('test')}
            className={`module-tab ${currentModule === 'test' ? 'active' : ''}`}
          >
            🔍 Firebase Test
          </button>
          
          <button 
            onClick={() => setCurrentModule('simple')}
            className={`module-tab ${currentModule === 'simple' ? 'active' : ''}`}
          >
            🧪 Simple Test
          </button>
        </div>
      </nav>
      
      <div className="app-content">
        {currentModule === 'lighting' && <Dashboard />}
        {currentModule === 'climate' && <ClimateControl />}
        {currentModule === 'test' && <FirebaseTest />}
        {currentModule === 'simple' && <SimpleTest />}
      </div>
    </div>
  )
}

export default App