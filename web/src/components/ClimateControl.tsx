import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../firebase';
import type { ClimateState } from '../types';
import { ROOM_ID, TEMP_LOW_MAX, TEMP_MED_MAX, AQ_GOOD_MAX, AQ_MODERATE_MAX } from '../types';
import './Dashboard.css'; // Reuse the same styles

export default function ClimateControl() {
  const [state, setState] = useState<ClimateState | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'reports'>('live');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    console.log('🚀 Climate Control component mounted, connecting to Firebase...');
    console.log('🎯 Target path:', `/climate/${ROOM_ID}/state`);
    const stateRef = ref(database, `/climate/${ROOM_ID}/state`);

    // Loading timeout: show error if no data after 3 seconds
    const loadingTimer = setTimeout(() => {
      setState(prevState => {
        if (!prevState) {
          setError('No Firebase data found. Check ESP32 Climate Control is running and writing to Firebase.');
          setIsConnected(false);
          // Return fallback state instead of null
          return {
            ts: Date.now(),
            tempC: 23.5,
            humidity: 45.0,
            aqRaw: 250,
            aqStatus: 'Good' as const,
            mode: 'auto' as const,
            fan: { on: false, pwm: 0 },
            comfortBand: 'Low' as const,
            presence: false,
            systemActive: false,
            boostMode: false,
            sensorError: 'No data - Demo mode'
          };
        }
        return prevState;
      });
    }, 3000);

    const unsubscribe = onValue(stateRef, (snapshot) => {
      clearTimeout(loadingTimer);
      
      const value = snapshot.val();
      console.log('🔥 Firebase climate snapshot received:', value);
      console.log('📍 Firebase path:', `/climate/${ROOM_ID}/state`);
      
      if (!value) {
        setIsConnected(false);
        setError('No live data. Ensure ESP32 Climate Control is running.');
        setState({
          ts: Date.now(),
          tempC: 23.5,
          humidity: 45.0,
          aqRaw: 250,
          aqStatus: 'Good',
          mode: 'auto',
          fan: { on: false, pwm: 0 },
          comfortBand: 'Low',
          presence: false,
          systemActive: false,
          boostMode: false,
          sensorError: 'No data - Demo mode'
        });
        return;
      }

      const dataTimestamp = value.ts ?? Date.now();
      const isStale = (Date.now() - dataTimestamp) > 15000; // >15s considered stale

      const merged = {
        ts: dataTimestamp,
        tempC: Number.isFinite(value.tempC) ? value.tempC : 0,
        humidity: Number.isFinite(value.humidity) ? value.humidity : 0,
        aqRaw: Number.isFinite(value.aqRaw) ? value.aqRaw : 0,
        aqStatus: (value.aqStatus as 'Good' | 'Moderate' | 'Poor') || 'Good',
        mode: (value.mode === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual',
        fan: {
          on: Boolean(value.fan?.on),
          pwm: Number.isFinite(value.fan?.pwm) ? value.fan.pwm : 0
        },
        comfortBand: (value.comfortBand as 'Low' | 'Moderate' | 'High' | 'Idle') || 'Low',
        presence: Boolean(value.presence),
        systemActive: Boolean(value.systemActive),
        boostMode: Boolean(value.boostMode),
        sensorError: value.sensorError ?? null
      } as const;

      console.log('Setting climate state:', merged);
      setState(merged);
      setIsConnected(!isStale);
      setError(isStale ? 'Live data is stale (>15s). Check ESP32 Climate Control.' : '');
    }, (err) => {
      clearTimeout(loadingTimer);
      console.error('Firebase climate connection error:', err);
      setIsConnected(false);
      setError(`Connection failed: ${err.message}`);
      setState({
        ts: Date.now(),
        tempC: 23.5,
        humidity: 45.0,
        aqRaw: 250,
        aqStatus: 'Good',
        mode: 'auto',
        fan: { on: false, pwm: 0 },
        comfortBand: 'Low',
        presence: false,
        systemActive: false,
        boostMode: false,
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
      const stateRef = ref(database, `/climate/${ROOM_ID}/state`);
      await update(stateRef, { mode: newMode });
    } catch (error) {
      console.error('Mode change failed:', error);
      alert('Mode change failed - check Firebase connection');
    }
  };

  const handleManualControl = async (fan: { on: boolean; pwm: number }) => {
    if (!state || state.mode !== 'manual') return;
    
    try {
      const stateRef = ref(database, `/climate/${ROOM_ID}/state`);
      await update(stateRef, { fan });
    } catch (error) {
      console.error('Manual control failed:', error);
      alert('Control failed - check Firebase connection');
    }
  };

  const handleBoostMode = async () => {
    if (!state) return;
    
    try {
      const stateRef = ref(database, `/climate/${ROOM_ID}/state`);
      await update(stateRef, { boostMode: !state.boostMode });
    } catch (error) {
      console.error('Boost mode failed:', error);
      alert('Boost mode failed - check Firebase connection');
    }
  };

  const getTemperatureStatus = (temp: number): 'success' | 'warning' | 'error' => {
    if (temp <= TEMP_LOW_MAX) return 'success';
    if (temp <= TEMP_MED_MAX) return 'warning';
    return 'error';
  };

  const getAirQualityStatus = (aqRaw: number): 'success' | 'warning' | 'error' => {
    if (aqRaw <= AQ_GOOD_MAX) return 'success';
    if (aqRaw <= AQ_MODERATE_MAX) return 'warning';
    return 'error';
  };

  const getFanSpeedLabel = (pwm: number): string => {
    if (pwm === 0) return 'OFF';
    if (pwm <= 85) return 'LOW';
    if (pwm <= 170) return 'MEDIUM';
    return 'HIGH';
  };

  if (!state) {
    return (
      <div className="dashboard loading">
        <div className="loader">
          <div className="spinner"></div>
          <p>Initializing Smart Climate Control...</p>
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
          {/* Status Tiles */}
          <div className="status-tiles">
            {/* Temperature Tile */}
            <div className={`status-tile ${getTemperatureStatus(state.tempC)}`}>
              <div className="tile-icon">🌡️</div>
              <div className="tile-content">
                <h3>TEMPERATURE</h3>
                <div className="tile-value">{state.tempC.toFixed(1)}°C</div>
                <div className="tile-status">{state.comfortBand}</div>
              </div>
            </div>

            {/* Air Quality Tile */}
            <div className={`status-tile ${getAirQualityStatus(state.aqRaw)}`}>
              <div className="tile-icon">🌬️</div>
              <div className="tile-content">
                <h3>AIR QUALITY</h3>
                <div className="tile-value">{state.aqRaw}</div>
                <div className="tile-status">{state.aqStatus}</div>
              </div>
            </div>

            {/* Fan Status Tile */}
            <div className={`status-tile ${state.fan.on ? 'success' : 'default'}`}>
              <div className="tile-icon">💨</div>
              <div className="tile-content">
                <h3>FAN STATUS</h3>
                <div className="tile-value">{state.fan.on ? 'ON' : 'OFF'}</div>
                <div className="tile-status">PWM: {state.fan.pwm}</div>
              </div>
            </div>

            {/* Mode Tile */}
            <div className={`status-tile ${state.mode === 'auto' ? 'success' : 'warning'}`}>
              <div className="tile-icon">⚙️</div>
              <div className="tile-content">
                <h3>MODE</h3>
                <div className="tile-value">{state.mode.toUpperCase()}</div>
                <div className="tile-status">{state.systemActive ? 'ACTIVE' : 'IDLE'}</div>
              </div>
            </div>

            {/* Last Update Tile */}
            <div className="status-tile default">
              <div className="tile-icon">🕐</div>
              <div className="tile-content">
                <h3>LAST UPDATE</h3>
                <div className="tile-value">{new Date(state.ts).toLocaleTimeString()}</div>
                <div className="tile-status">
                  {Math.round((Date.now() - state.ts) / 1000)}s ago
                </div>
              </div>
            </div>
          </div>

          {/* Presence Status */}
          <div className="presence-status">
            <div className={`presence-indicator ${state.presence ? 'detected' : 'none'}`}>
              <span className="presence-icon">{state.presence ? '👥' : '🚫'}</span>
              <span className="presence-text">
                {state.presence ? 'PRESENCE DETECTED' : 'NO PRESENCE'}
              </span>
              <span className="system-status">
                System: {state.systemActive ? 'ACTIVE' : 'IDLE'}
              </span>
            </div>
          </div>

          {/* Control Mode */}
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

          {/* Manual Controls */}
          {state.mode === 'manual' && (
            <div className="manual-controls">
              <h3>Manual Fan Control</h3>
              <div className="control-group">
                <div className="control-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={state.fan.on}
                      onChange={(e) => handleManualControl({ 
                        on: e.target.checked, 
                        pwm: e.target.checked ? state.fan.pwm || 128 : 0 
                      })}
                    />
                    Fan Power
                  </label>
                </div>
                {state.fan.on && (
                  <div className="control-item">
                    <label>
                      Fan Speed: {getFanSpeedLabel(state.fan.pwm)} ({state.fan.pwm})
                      <input
                        type="range"
                        min="30"
                        max="255"
                        value={state.fan.pwm}
                        onChange={(e) => handleManualControl({ 
                          on: true, 
                          pwm: parseInt(e.target.value) 
                        })}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Boost Mode */}
          <div className="boost-control">
            <button 
              className={`boost-button ${state.boostMode ? 'active' : ''}`}
              onClick={handleBoostMode}
              disabled={!state.systemActive}
            >
              🚀 {state.boostMode ? 'BOOST ACTIVE' : 'ACTIVATE BOOST'} (10 min)
            </button>
            {!state.systemActive && (
              <p className="boost-note">⚠️ Boost requires presence detection</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '8px',
          margin: '2rem 0'
        }}>
          <h3>📊 Climate Analytics - Coming Soon</h3>
          <p>This section will show temperature trends, humidity charts, and fan usage analytics.</p>
        </div>
      )}
    </div>
  );
}
