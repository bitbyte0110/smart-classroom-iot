import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../firebase';
import type { LightingState } from '../types';
import { ROOM_ID } from '../types';
import StatusTiles from './StatusTiles';
import ManualControls from './ManualControls';
import Reports from './Reports';
import VoiceControl from './VoiceControl';
import './Dashboard.css';

export default function Dashboard() {
  const [state, setState] = useState<LightingState | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'reports'>('live');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastModeChange, setLastModeChange] = useState<number>(0);
  const [isVoiceListening, setIsVoiceListening] = useState(false);

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
            sensorError: 'No data - Timeout',
            ai_people_count: 0
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
      
      if (!value) {
        setIsConnected(false);
        setError('No live data. Ensure ESP32 and Camera AI are running.');
        setState({
          ts: Date.now(),
          presence: false,
          ldrRaw: 1200,  // Show demo data instead of 0
          mode: 'auto',
          led: { on: false, pwm: 0 },
          sensorError: 'No data - Demo mode',
          ai_people_count: 0
        });
        return;
      }

      const dataTimestamp = value.ai_timestamp ?? value.timestamp ?? value.ts ?? Date.now();
      const isStale = (Date.now() - dataTimestamp) > 10000; // >10s considered stale

      const presenceFromAI = typeof value.ai_presence === 'boolean' ? value.ai_presence : false;
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
        sensorError: value.sensorError ?? null,
        ai_people_count: Number.isFinite(value.ai_people_count) ? value.ai_people_count : 0
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
    
    // Prevent rapid mode changes (debounce)
    const now = Date.now();
    if (now - lastModeChange < 1000) {
      console.log('⏱️ Mode change too fast, ignoring');
      return;
    }
    setLastModeChange(now);
    
    // Optimistic UI update - update immediately for better responsiveness
    setState(prevState => prevState ? { ...prevState, mode: newMode } : null);
    
    try {
      const stateRef = ref(database, `/lighting/${ROOM_ID}/state`);
      await update(stateRef, { mode: newMode });
      console.log(`✅ Lighting mode changed to: ${newMode}`);
    } catch (error) {
      console.error('Mode change failed:', error);
      // Revert optimistic update on error
      setState(prevState => prevState ? { ...prevState, mode: state.mode } : null);
      alert('Mode change failed - check Firebase connection');
    }
  };

  const handleManualControl = async (led: { on: boolean; pwm: number }) => {
    if (!state || state.mode !== 'manual') return;
    
    // Optimistic UI update for instant feedback
    setState(prevState => prevState ? { ...prevState, led } : null);
    
    try {
      const stateRef = ref(database, `/lighting/${ROOM_ID}/state`);
      await update(stateRef, { led });
      console.log(`✅ Lighting control: ${led.on ? 'ON' : 'OFF'} (PWM: ${led.pwm})`);
    } catch (error) {
      console.error('Manual control failed:', error);
      // Revert optimistic update on error
      setState(prevState => prevState ? { ...prevState, led: state.led } : null);
      alert('Control failed - check Firebase connection');
    }
  };

  // Voice control handlers
  const handleVoiceLightingControl = (command: string) => {
    if (!state) return;
    
    console.log(`🎤 Voice lighting command received: "${command}"`);
    console.log(`🎤 Current LED state: on=${state.led.on}, pwm=${state.led.pwm}, mode=${state.mode}`);
    
    // Switch to manual mode for voice commands
    if (state.mode !== 'manual') {
      console.log(`🎤 Switching to manual mode for voice command`);
      handleModeChange('manual');
      // Wait a moment for mode change to take effect
      setTimeout(() => {
        processVoiceCommand(command);
      }, 100);
      return;
    }
    
    processVoiceCommand(command);
  };
  
  const processVoiceCommand = (command: string) => {
    if (!state) return;
    
    switch (command) {
      case 'on':
        handleManualControl({ on: true, pwm: state.led.pwm || 128 });
        break;
      case 'off':
        handleManualControl({ on: false, pwm: 0 });
        break;
      case 'brighter': {
        // Fix: Increase by 50% of current value (not 150% of current value)
        const currentPwm = state.led.pwm || 128;
        const increaseAmount = Math.round(currentPwm * 0.5); // 50% of current value
        const brighterPwm = Math.min(255, currentPwm + increaseAmount);
        console.log(`🎤 BRIGHTER: ${currentPwm} → ${brighterPwm} (+${increaseAmount} = 50% increase)`);
        handleManualControl({ on: true, pwm: brighterPwm });
        break;
      }
      case 'dimmer': {
        // Fix: Decrease by 50% instead of fixed 50
        const currentPwm = state.led.pwm || 128;
        const dimmerPwm = Math.max(0, Math.round(currentPwm * 0.5));
        console.log(`🎤 DIMMER: ${currentPwm} → ${dimmerPwm} (50% reduction)`);
        handleManualControl({ on: dimmerPwm > 0, pwm: dimmerPwm });
        break;
      }
      case 'max':
        console.log(`🎤 MAX: Setting to 255 (maximum brightness)`);
        console.log(`🎤 Current state before max: mode=${state.mode}, led.on=${state.led.on}, led.pwm=${state.led.pwm}`);
        handleManualControl({ on: true, pwm: 255 });
        console.log(`🎤 MAX command sent: on=true, pwm=255`);
        break;
      case 'min':
        handleManualControl({ on: true, pwm: 50 });
        break;
      case 'medium':
        handleManualControl({ on: true, pwm: 128 });
        break;
    }
  };

  const handleVoiceToggle = () => {
    setIsVoiceListening(!isVoiceListening);
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
        <h1>💡 Smart Classroom Lighting Control</h1>
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

          <VoiceControl
            onLightingControl={handleVoiceLightingControl}
            onModeChange={handleModeChange}
            isListening={isVoiceListening}
            onToggleListening={handleVoiceToggle}
            currentModule="lighting"
          />
        </div>
      )}

      {activeTab === 'reports' && (
        <Reports />
      )}
    </div>
  );
}