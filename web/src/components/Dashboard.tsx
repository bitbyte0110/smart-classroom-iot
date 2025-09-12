import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db as database } from '../firebase';
import type { LightingState } from '../types';
import { ROOM_ID } from '../types';
import StatusTiles from './StatusTiles';
import ManualControls from './ManualControls';
import Reports from './Reports';
import './Dashboard.css';

export default function Dashboard() {
  const [state, setState] = useState<LightingState | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'reports'>('live');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    console.log('🚀 Dashboard component mounted, connecting to Firebase...');
    console.log('🎯 Target path:', `/lighting/${ROOM_ID}/state`);
    const stateRef = ref(database, `/lighting/${ROOM_ID}/state`);

    // Loading timeout: show error if no data after 3 seconds
    const loadingTimer = setTimeout(() => {
      setState(prevState => {
        if (!prevState) {
          setError('No Firebase data found. Check ESP32 and Camera AI are running and writing to Firebase.');
          setIsConnected(false);
          // Return fallback state instead of null
          return {
            ts: Date.now(),
            presence: false,
            ldrRaw: 1200,
            mode: 'auto' as const,
            led: { on: false, pwm: 0 },
            sensorError: 'No data - Timeout'
          };
        }
        return prevState;
      });
    }, 3000);

    const unsubscribe = onValue(stateRef, (snapshot) => {
      clearTimeout(loadingTimer);
      
      const value = snapshot.val();
      console.log('🔥 Firebase snapshot received:', value); // Debug log
      console.log('📍 Firebase path:', `/lighting/${ROOM_ID}/state`); // Debug path
      console.log('🔍 Data structure check:', {
        hasAiPresence: 'ai_presence' in value,
        hasPresence: 'presence' in value,
        hasLdrRaw: 'ldrRaw' in value,
        hasLed: 'led' in value,
        hasMode: 'mode' in value,
        aiPresence: value.ai_presence,
        presence: value.presence,
        ldrRaw: value.ldrRaw,
        led: value.led,
        mode: value.mode
      });
      
      if (!value) {
        setIsConnected(false);
        setError('No live data. Ensure ESP32 and Camera AI are running.');
        setState({
          ts: Date.now(),
          presence: false,
          ldrRaw: 1200,  // Show demo data instead of 0
          mode: 'auto',
          led: { on: false, pwm: 0 },
          sensorError: 'No data - Demo mode'
        });
        return;
      }

      const dataTimestamp = value.ai_timestamp ?? value.timestamp ?? value.ts ?? Date.now();
      const isStale = (Date.now() - dataTimestamp) > 10000; // >10s considered stale

      // Handle both old and new data structures
      const presenceFromAI = typeof value.ai_presence === 'boolean' ? value.ai_presence : 
                            typeof value.presence === 'boolean' ? value.presence : false;
      const uiPresence = presenceFromAI && !isStale;

      const merged = {
        ts: dataTimestamp,
        presence: uiPresence,
        ldrRaw: Number.isFinite(value.ldrRaw) ? value.ldrRaw : 0,
        mode: (value.mode === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual',
        led: {
          on: Boolean(value.led?.on),
          pwm: Number.isFinite(value.led?.pwm) ? value.led.pwm : 0
        },
        sensorError: value.sensorError ?? null
      } as const;

      console.log('Setting state:', merged); // Debug log
      setState(merged);
      setIsConnected(!isStale);
      setError(isStale ? 'Live data is stale (>10s). Check Camera AI and ESP32.' : '');
    }, (err) => {
      clearTimeout(loadingTimer);
      console.error('Firebase connection error:', err);
      setIsConnected(false);
      setError(`Connection failed: ${err.message}`);
      setState({
        ts: Date.now(),
        presence: false,
        ldrRaw: 1200,  // Show demo data
        mode: 'auto',
        led: { on: false, pwm: 0 },
        sensorError: 'Connection failed - Demo mode'
      });
    });

    return () => {
      clearTimeout(loadingTimer);
      unsubscribe();
    };
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

  if (!state) {
    return (
      <div className="dashboard loading">
        <div className="loader">
          <div className="spinner"></div>
          <p>Initializing Smart Lighting System...</p>
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
          <span>{isConnected ? 'Live Data' : 'Demo Mode'}</span>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

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