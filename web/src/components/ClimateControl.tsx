import { useState, useEffect, useRef } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../firebase';
import type { ClimateState } from '../types';
import { ROOM_ID } from '../types';
import ClimateStatusTiles from './ClimateStatusTiles';
import ClimateManualControls from './ClimateManualControls';
import ClimateReports from './ClimateReports';
import VoiceControl from './VoiceControl';
import './Dashboard.css'; // Reuse the same styles

export default function ClimateControl() {
  const [state, setState] = useState<ClimateState | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'reports'>('live');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastModeChange, setLastModeChange] = useState<number>(0);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const currentFanPwmRef = useRef(0);

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
            sensorError: 'No data - Timeout',
            ai_people_count: 0
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
          sensorError: 'No data - Demo mode',
          ai_people_count: 0
        };
        setState(demoState);
        return;
      }

      const dataTimestamp = value.ai_timestamp ?? value.ts ?? Date.now();
      const now = Date.now();
      const timeDiff = now - dataTimestamp;
      const isStale = timeDiff > 10000; // Use same 10s threshold as lighting module
      
      // Debug timestamp issues
      if (timeDiff > 5000) {
        console.warn(`⏰ Climate data timestamp issue:`, {
          currentTime: new Date(now).toISOString(),
          dataTime: new Date(dataTimestamp).toISOString(),
          differenceSeconds: Math.round(timeDiff / 1000),
          isStale
        });
      }

      // Get presence from AI data (same as lighting module for immediate updates)
      const presenceFromAI = typeof value.ai_presence === 'boolean' ? value.ai_presence : false;
      const uiPresence = presenceFromAI && !isStale;
      
      // AI data extraction (same as lighting module)
      const aiPeopleCount = Number.isFinite(value.ai_people_count) ? value.ai_people_count : 0;

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
        presence: uiPresence,
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
        sensorError: value.sensorError ?? null,
        ai_people_count: aiPeopleCount
      };

      // Debug fan PWM changes to identify override issues
      if (state && state.fan.pwm !== merged.fan.pwm) {
        console.log(`🌪️ Fan PWM changed: ${state.fan.pwm} → ${merged.fan.pwm} (Mode: ${merged.mode})`);
        if (merged.mode === 'manual' && state.fan.pwm === 255 && merged.fan.pwm < 255) {
          console.warn(`⚠️ Manual fan setting overridden! 255 → ${merged.fan.pwm} - ESP32 may be running auto control`);
        }
      }


      console.log('Setting climate state:', merged); // Debug log
      console.log(`🌪️ Fan state from Firebase: ON=${merged.fan.on}, PWM=${merged.fan.pwm}, Mode=${merged.mode}`); // Debug fan specifically
      
      // Update the ref with current fan PWM value
      currentFanPwmRef.current = merged.fan.pwm;
      console.log(`🎯 Updated currentFanPwmRef to: ${currentFanPwmRef.current}`);
      
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
        sensorError: 'Connection failed - Demo mode',
        ai_people_count: 0
      };
      setState(errorState);
    });

    return () => {
      clearTimeout(loadingTimer);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const stateRef = ref(database, `/climate/${ROOM_ID}/state`);
      await update(stateRef, { mode: newMode });
      console.log(`✅ Climate mode changed to: ${newMode}`);
    } catch (error) {
      console.error('Mode change failed:', error);
      // Revert optimistic update on error
      setState(prevState => prevState ? { ...prevState, mode: state.mode } : null);
      alert('Mode change failed - check Firebase connection');
    }
  };

  const handleManualControl = async (fan: { on: boolean; pwm: number }) => {
    console.log(`🎛️ handleManualControl called: on=${fan.on}, pwm=${fan.pwm}, currentMode=${state?.mode}`);
    console.log(`🎛️ Previous fan state: on=${state?.fan.on}, pwm=${state?.fan.pwm}`);
    
    if (!state || state.mode !== 'manual') {
      console.log(`❌ handleManualControl blocked: state=${!!state}, mode=${state?.mode}`);
      return;
    }
    
    // Optimistic UI update for instant feedback
    console.log(`🎛️ Updating state optimistically to: on=${fan.on}, pwm=${fan.pwm}`);
    currentFanPwmRef.current = fan.pwm; // Update ref immediately
    setState(prevState => prevState ? { ...prevState, fan } : null);
    
    try {
      const stateRef = ref(database, `/climate/${ROOM_ID}/state`);
      console.log(`📤 Sending to Firebase: { fan: { on: ${fan.on}, pwm: ${fan.pwm} } }`);
      await update(stateRef, { fan });
      console.log(`✅ Climate fan control: ${fan.on ? 'ON' : 'OFF'} (PWM: ${fan.pwm})`);
    } catch (error) {
      console.error('Manual control failed:', error);
      // Revert optimistic update on error
      setState(prevState => prevState ? { ...prevState, fan: state.fan } : null);
      alert('Control failed - check Firebase connection');
    }
  };

  // Voice control handlers
  const handleVoiceClimateControl = (command: string) => {
    if (!state) return;
    
    console.log(`🎤 Voice climate command received: "${command}"`);
    console.log(`🎤 Current fan state: on=${state.fan.on}, pwm=${state.fan.pwm}, mode=${state.mode}`);
    console.log(`🎤 Timestamp: ${new Date().toISOString()}`);
    
    // Switch to manual mode for voice commands
    if (state.mode !== 'manual') {
      console.log(`🎤 Switching to manual mode for voice command`);
      handleModeChange('manual').then(() => {
        // Wait for mode change to complete, then execute command
        setTimeout(() => {
          console.log(`🎤 Mode changed, now executing command: ${command}`);
          console.log(`🎤 State after mode change: on=${state?.fan.on}, pwm=${state?.fan.pwm}, mode=${state?.mode}`);
          processVoiceCommand(command);
        }, 200);
      }).catch((error) => {
        console.error('Mode change failed:', error);
      });
      return;
    }
    
    console.log(`🎤 Already in manual mode, executing command directly`);
    processVoiceCommand(command);
  };
  
  const processVoiceCommand = (command: string) => {
    if (!state) return;
    
    console.log(`🎤 processVoiceCommand called with: "${command}"`);
    console.log(`🎤 Current fan state in processVoiceCommand: on=${state.fan.on}, pwm=${state.fan.pwm}, mode=${state.mode}`);
    
    switch (command) {
      case 'fan_on':
        // Turn on fan with PWM 255 (as per requirements)
        console.log(`🎤 FAN ON: Setting to PWM 255`);
        handleManualControl({ on: true, pwm: 255 });
        break;
      case 'fan_off':
        // Turn off fan with PWM 0
        console.log(`🎤 FAN OFF: Setting to PWM 0`);
        handleManualControl({ on: false, pwm: 0 });
        break;
      case 'fan_high':
        // Maximum fan speed - PWM 255
        console.log(`🎤 FAN HIGH: Setting to PWM 255 (maximum)`);
        handleManualControl({ on: true, pwm: 255 });
        break;
      case 'fan_low': {
        // Decrease fan speed by 50% - use ref for current value
        const currentPwm = currentFanPwmRef.current || 0;
        const newPwm = Math.max(0, Math.round(currentPwm * 0.5)); // Decrease by 50%
        console.log(`🎤 FAN LOW: ${currentPwm} → ${newPwm} (50% decrease)`);
        console.log(`🎤 Ref PWM value: ${currentFanPwmRef.current}`);
        handleManualControl({ on: newPwm > 0, pwm: newPwm });
        break;
      }
      case 'fan_medium':
        console.log(`🎤 FAN MEDIUM: Setting to 170`);
        handleManualControl({ on: true, pwm: 170 });
        break;
      case 'fan_increase': {
        // Increase fan speed by 50% - if current is 0, start from 50
        const currentPwm = currentFanPwmRef.current || 0;
        let newPwm;
        if (currentPwm === 0) {
          newPwm = 50; // Start from 50 if currently 0
        } else {
          newPwm = Math.min(255, Math.round(currentPwm * 1.5)); // Increase by 50%
        }
        console.log(`🎤 FAN INCREASE: ${currentPwm} → ${newPwm} (50% increase)`);
        console.log(`🎤 Ref PWM value: ${currentFanPwmRef.current}`);
        handleManualControl({ on: true, pwm: newPwm });
        break;
      }
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
              airQualityStatus={state.aqStatus}
              airQualityAlert={state.aqAlert}
            />
          )}

          <VoiceControl
            onClimateControl={handleVoiceClimateControl}
            onModeChange={handleModeChange}
            isListening={isVoiceListening}
            onToggleListening={handleVoiceToggle}
            currentModule="climate"
          />
        </div>
      )}

      {activeTab === 'reports' && (
        <ClimateReports />
      )}
    </div>
  );
}
