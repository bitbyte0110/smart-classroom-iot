import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../firebase';
import { LightingState, ROOM_ID } from '../types';
import StatusTiles from './StatusTiles';
import ManualControls from './ManualControls';
import Reports from './Reports';
import './Dashboard.css';

export default function Dashboard() {
  const [state, setState] = useState<LightingState | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'reports'>('live');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const stateRef = ref(database, `/lighting/${ROOM_ID}/state`);
    
    const unsubscribe = onValue(stateRef, (snapshot) => {
      const value = snapshot.val();
      if (value) {
        setState(value);
        setIsConnected(true);
      }
    }, (error) => {
      console.error('Firebase connection error:', error);
      setIsConnected(false);
    });

    return () => unsubscribe();
  }, []);

  const handleModeChange = async (newMode: 'auto' | 'manual') => {
    if (!state) return;
    
    try {
      const stateRef = ref(database, `/lighting/${ROOM_ID}/state`);
      await update(stateRef, { mode: newMode });
    } catch (error) {
      console.error('Mode change failed:', error);
    }
  };

  const handleManualControl = async (led: { on: boolean; pwm: number }) => {
    if (!state || state.mode !== 'manual') return;
    
    try {
      const stateRef = ref(database, `/lighting/${ROOM_ID}/state`);
      await update(stateRef, { led });
    } catch (error) {
      console.error('Manual control failed:', error);
    }
  };

  if (!state) {
    return (
      <div className="dashboard loading">
        <div className="loader">
          <div className="spinner"></div>
          <p>Connecting to Smart Lighting System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🏫 Smart Classroom Lighting Control</h1>
        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={activeTab === 'live' ? 'active' : ''}
          onClick={() => setActiveTab('live')}
        >
          Live Control
        </button>
        <button 
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          Reports & Analytics
        </button>
      </nav>

      {activeTab === 'live' && (
        <div className="live-control">
          <StatusTiles state={state} />
          
          <div className="mode-control">
            <h3>Control Mode</h3>
            <div className="mode-switch">
              <button 
                className={state.mode === 'auto' ? 'active' : ''}
                onClick={() => handleModeChange('auto')}
              >
                🤖 Automatic
              </button>
              <button 
                className={state.mode === 'manual' ? 'active' : ''}
                onClick={() => handleModeChange('manual')}
              >
                🎛️ Manual
              </button>
            </div>
          </div>

          {state.mode === 'manual' && (
            <ManualControls 
              led={state.led}
              onControlChange={handleManualControl}
            />
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <Reports />
      )}
    </div>
  );
}