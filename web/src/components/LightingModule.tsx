import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../firebase';
import type { LightingState } from '../types';
import { ROOM_ID } from '../types';
import StatusTiles from './StatusTiles';
import ManualControls from './ManualControls';
import Reports from './Reports';

export default function LightingModule() {
  const [state, setState] = useState<LightingState | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'reports'>('live');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>('');
  const [lightingLoading, setLightingLoading] = useState(true);

  useEffect(() => {
    // Initialize with demo data immediately
    const initializeLighting = () => {
      setState({
        ts: Date.now(),
        presence: false,
        ldrRaw: 3000,
        mode: 'auto' as const,
        led: { on: false, pwm: 0 },
        sensorError: null
      });
      setError('Demo mode - Start Firebase emulator and simulator for live data');
      setLightingLoading(false);
    };

    // Initialize immediately with demo data
    initializeLighting();

    // Try Firebase connection but don't block on it
    const stateRef = ref(database, `/lighting/${ROOM_ID}/state`);
    
    const unsubscribe = onValue(stateRef, (snapshot) => {
      const value = snapshot.val();
      if (value) {
        setState(value);
        setIsConnected(true);
        setError('');
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
      alert('Mode change failed - check Firebase connection');
    }
  };

  const handleManualControl = async (led: { on: boolean; pwm: number }) => {
    if (!state || state.mode !== 'manual') return;
    
    try {
      const stateRef = ref(database, `/lighting/${ROOM_ID}/state`);
      await update(stateRef, { led });
    } catch (error) {
      console.error('Manual control failed:', error);
      alert('Control failed - check Firebase connection');
    }
  };

  const renderLightingSection = () => {
    if (lightingLoading) {
      return (
        <div className="loading-section">
          <div className="spinner"></div>
          <p>Initializing lighting system...</p>
        </div>
      );
    }

    if (!state) {
      return (
        <div className="error-section">
          <p>⚠️ Failed to load lighting system</p>
        </div>
      );
    }

    return (
      <>
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
      </>
    );
  };

  return (
    <div className="module-container">
      <header className="module-header">
        <h1>💡 Smart Lighting Control</h1>
        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
          <span>{isConnected ? 'Live Data' : 'Demo Mode'}</span>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      <nav className="module-nav">
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

      <div className="module-content">
        {activeTab === 'live' && (
          <div className="live-control">
            {renderLightingSection()}
          </div>
        )}

        {activeTab === 'reports' && (
          <Reports />
        )}
      </div>
    </div>
  );
}
