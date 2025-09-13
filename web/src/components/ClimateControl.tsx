import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../firebase';
import type { ClimateState } from '../types';
import { ROOM_ID } from '../types';
import ClimateStatusTiles from './ClimateStatusTiles';
import ClimateManualControls from './ClimateManualControls';
import ClimateReports from './ClimateReports';
import { useVoiceControl } from '../contexts/VoiceControlContext';
import './Dashboard.css'; // Reuse the same styles

export default function ClimateControl() {
  const { setClimateHandler, setModeHandler } = useVoiceControl();
  const [state, setState] = useState<ClimateState | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'reports'>('live');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastModeChange, setLastModeChange] = useState<number>(0);

  useEffect(() => {
    console.log('🚀 Climate Control component mounted, connecting to Firebase...');
    console.log('🎯 Target path:', `/climate/${ROOM_ID}/state`);
    const stateRef = ref(database, `/climate/${ROOM_ID}/state`);

    // Loading timeout: show error if no data after 3 seconds
    const loadingTimer = setTimeout(() => {
      setState(prevState => {
        if (!prevState) {
          setError('No Firebase data found. Check ESP32 Climate Module is running and writing to Firebase.');
          setIsConnected(false);
          // Return fallback state instead of null
          const fallbackState: ClimateState = {
            ts: Date.now(),
            presence: false,
            tempC: 26.5,
            humidity: 45.0,
            aqRaw: 250,
            aqStatus: 'Good',
            aqAlert: '',
            mode: 'auto' as const,
            fan: { on: false, pwm: 0 },
            comfortBand: 'Moderate',
            sensorError: 'No data - Timeout'
          };
          return fallbackState;
        }
        return prevState;
      });
    }, 3000);

    const unsubscribe = onValue(stateRef, (snapshot) => {
      clearTimeout(loadingTimer);
      
      const value = snapshot.val();
      console.log('🔥 Firebase snapshot received (Climate):', value); // Debug log
      console.log('📍 Firebase path:', `/climate/${ROOM_ID}/state`); // Debug path
      
      if (!value) {
        setIsConnected(false);
        setError('No live data. Ensure ESP32 Climate Module is running.');
        const demoState: ClimateState = {
          ts: Date.now(),
          presence: false,
          tempC: 26.5,
          humidity: 45.0,
          aqRaw: 250,
          aqStatus: 'Good',
          aqAlert: '',
          mode: 'auto',
          fan: { on: false, pwm: 0 },
          comfortBand: 'Moderate',
          sensorError: 'No data - Demo mode'
        };
        setState(demoState);
        return;
      }

      const dataTimestamp = value.ts ?? Date.now();
      const now = Date.now();
      const timeDiff = now - dataTimestamp;
      const isStale = timeDiff > 30000; // Increased tolerance to 30s for ESP32 sync issues
      
      // Debug timestamp issues
      if (timeDiff > 15000) {
        console.warn(`⏰ Climate data timestamp issue:`, {
          currentTime: new Date(now).toISOString(),
          dataTime: new Date(dataTimestamp).toISOString(),
          differenceSeconds: Math.round(timeDiff / 1000),
          isStale
        });
      }

      // Get presence from the same AI source (follows lighting module)
      const presenceValue = value.presence ?? false;

      // Derive AQ status/alert if missing
      const classifyAQ = (raw: number) => {
        if (raw >= 401) return { aqStatus: 'Poor' as const, aqAlert: 'Alert, air quality poor' };
        if (raw >= 301) return { aqStatus: 'Moderate' as const, aqAlert: 'Warning, air quality moderate' };
        return { aqStatus: 'Good' as const, aqAlert: '' };
      };
      const aqRawVal = Number.isFinite(value.aqRaw) ? value.aqRaw : 0;
      const derived = classifyAQ(aqRawVal);

      const merged: ClimateState = {
        ts: dataTimestamp,
        presence: presenceValue && !isStale,
        tempC: Number.isFinite(value.tempC) ? value.tempC : 0,
        humidity: Number.isFinite(value.humidity) ? value.humidity : 0,
        aqRaw: aqRawVal,
        aqStatus: (value.aqStatus || derived.aqStatus),
        aqAlert: (value.aqAlert ?? derived.aqAlert),
        mode: (value.mode === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual',
        fan: {
          on: Boolean(value.fan?.on),
          pwm: Number.isFinite(value.fan?.pwm) ? value.fan.pwm : 0
        },
        comfortBand: (value.comfortBand || 'Moderate') as 'Low' | 'Moderate' | 'High',
        sensorError: value.sensorError ?? null
      };

      console.log('Setting climate state:', merged); // Debug log
      
      // Debug air quality alerts
      if (merged.aqAlert) {
        console.log(`🚨 Air Quality Alert: ${merged.aqStatus} - ${merged.aqAlert}`);
      }
      setState(merged);
      setIsConnected(!isStale);
      setError(isStale ? `Live data is stale (${Math.round(timeDiff/1000)}s old). Check ESP32 time sync or Firebase connection.` : '');
    }, (err) => {
      clearTimeout(loadingTimer);
      console.error('Firebase connection error (Climate):', err);
      setIsConnected(false);
      setError(`Connection failed: ${err.message}`);
      const errorState: ClimateState = {
        ts: Date.now(),
        presence: false,
        tempC: 26.5,
        humidity: 45.0,
        aqRaw: 250,
        aqStatus: 'Good',
        aqAlert: '',
        mode: 'auto',
        fan: { on: false, pwm: 0 },
        comfortBand: 'Moderate',
        sensorError: 'Connection failed - Demo mode'
      };
      setState(errorState);
    });

    return () => {
      clearTimeout(loadingTimer);
      unsubscribe();
    };
  }, []);

  const handleModeChange = useCallback(async (newMode: 'auto' | 'manual') => {
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
      const stateRef = ref(database, `/climate/${ROOM_ID}/state`);
      await update(stateRef, { mode: newMode });
      console.log(`✅ Climate mode changed to: ${newMode}`);
    } catch (error) {
      console.error('Mode change failed:', error);
      // Revert optimistic update on error
      setState(prevState => prevState ? { ...prevState, mode: state.mode } : null);
      alert('Mode change failed - check Firebase connection');
    }
  }, [state, lastModeChange]);

  const handleManualControl = useCallback(async (fan: { on: boolean; pwm: number }) => {
    if (!state || state.mode !== 'manual') return;
    
    // Optimistic UI update for instant feedback
    setState(prevState => prevState ? { ...prevState, fan } : null);
    
    try {
      const stateRef = ref(database, `/climate/${ROOM_ID}/state`);
      await update(stateRef, { fan });
      console.log(`✅ Climate fan control: ${fan.on ? 'ON' : 'OFF'} (PWM: ${fan.pwm})`);
    } catch (error) {
      console.error('Manual control failed:', error);
      // Revert optimistic update on error
      setState(prevState => prevState ? { ...prevState, fan: state.fan } : null);
      alert('Control failed - check Firebase connection');
    }
  }, [state]);

  // Voice control handlers
  const handleVoiceClimateControl = useCallback((command: string) => {
    if (!state) return;
    
    console.log(`🎤 Voice climate command: ${command}`);
    
    switch (command) {
      case 'fan_on':
        handleManualControl({ on: true, pwm: state.fan.pwm || 128 });
        break;
      case 'fan_off':
        handleManualControl({ on: false, pwm: 0 });
        break;
      case 'fan_high':
        handleManualControl({ on: true, pwm: 255 });
        break;
      case 'fan_low':
        handleManualControl({ on: true, pwm: 85 });
        break;
      case 'fan_medium':
        handleManualControl({ on: true, pwm: 170 });
        break;
      case 'boost':
        // Boost mode - set fan to maximum for 10 minutes
        handleManualControl({ on: true, pwm: 255 });
        // Note: In a real implementation, you'd set a timer to reset after 10 minutes
        break;
    }
  }, [state, handleManualControl]);


  // Register voice control handlers with global context
  useEffect(() => {
    setClimateHandler(handleVoiceClimateControl);
    setModeHandler(handleModeChange);
    
    return () => {
      setClimateHandler(() => {});
      setModeHandler(() => {});
    };
  }, [setClimateHandler, setModeHandler, handleVoiceClimateControl, handleModeChange]);

  if (!state) {
    return (
      <div className="dashboard loading">
        <div className="loader">
          <div className="spinner"></div>
          <p>Initializing Smart Climate Control System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🌡️ Smart Classroom Climate Control</h1>
        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
          <span>{isConnected ? 'Live Data' : 'Offline Mode'}</span>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      {state?.aqAlert && (
        <div className={`alert-banner ${state.aqStatus === 'Poor' ? 'critical' : 'warning'}`}>
          <div className="alert-content">
            <span className="alert-icon">
              {state.aqStatus === 'Poor' ? '🚨' : '⚠️'}
            </span>
            <div className="alert-details">
              <div className="alert-title">
                {state.aqStatus === 'Poor' ? 'CRITICAL AIR QUALITY ALERT' : 'AIR QUALITY WARNING'}
              </div>
              <div className="alert-message">{state.aqAlert}</div>
              <div className="alert-reading">
                MQ-135 Reading: {state.aqRaw} 
                {state.aqStatus === 'Poor' ? ' (>400 - Critical)' : 
                 state.aqStatus === 'Moderate' ? ' (301-400 - Moderate)' : ' (0-300 - Good)'}
              </div>
              {state.aqStatus === 'Poor' && state.presence && (
                <div className="alert-action">✅ Fan automatically set to MAXIMUM speed</div>
              )}
              {state.aqStatus === 'Poor' && !state.presence && (
                <div className="alert-action">⚠️ Fan control requires presence detection</div>
              )}
            </div>
          </div>
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
          <ClimateStatusTiles state={state} />
          
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
            <ClimateManualControls 
              fan={state.fan}
              onControlChange={handleManualControl}
            />
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <ClimateReports />
      )}
    </div>
  );
}
