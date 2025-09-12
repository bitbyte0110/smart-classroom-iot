import { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Dashboard.css';
import type {
  ClimateState,
  ClimateLogEntry,
  FanMode
} from '../services/climateService';
import {
  subscribeClimateState,
  subscribeClimateLogs,
  setMode,
  setFanOn,
  setFanPWM,
  boostHigh,
  deriveAQStatus,
  comfortBand,
  toCSV,
  validateClimateData
} from '../services/climateService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function ClimateControl() {
  const [activeTab, setActiveTab] = useState<'live' | 'reports'>('live');
  const [state, setState] = useState<ClimateState | null>(null);
  const [logs, setLogs] = useState<ClimateLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomId] = useState('roomA'); // Could be made configurable
  
  // Control state
  const [isChangingMode, setIsChangingMode] = useState(false);
  const [isChangingFan, setIsChangingFan] = useState(false);
  const [isBoostActive, setIsBoostActive] = useState(false);

  // Subscribe to live data
  useEffect(() => {
    let unsubscribeState: (() => void) | null = null;
    let unsubscribeLogs: (() => void) | null = null;

    try {
      // Subscribe to current state
      unsubscribeState = subscribeClimateState(roomId, (newState) => {
        setState(newState);
        setLoading(false);
        setError(null);
      });

      // Subscribe to recent logs (last 1000 entries or last 24 hours)
      const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
      unsubscribeLogs = subscribeClimateLogs(
        roomId, 
        setLogs, 
        { lastN: 1000, sinceMs: last24Hours }
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Firebase');
      setLoading(false);
    }

    return () => {
      if (unsubscribeState) unsubscribeState();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, [roomId]);

  // Control handlers
  const handleModeChange = async (newMode: FanMode) => {
    if (isChangingMode) return;
    
    setIsChangingMode(true);
    try {
      await setMode(roomId, newMode);
    } catch (err) {
      console.error('Failed to change mode:', err);
    }
    setTimeout(() => setIsChangingMode(false), 1000);
  };

  const handleFanToggle = async () => {
    if (isChangingFan || !state?.fan) return;
    
    setIsChangingFan(true);
    try {
      await setFanOn(roomId, !state.fan.on);
    } catch (err) {
      console.error('Failed to toggle fan:', err);
    }
    setTimeout(() => setIsChangingFan(false), 1000);
  };

  const handlePWMChange = async (pwm: number) => {
    try {
      await setFanPWM(roomId, pwm);
    } catch (err) {
      console.error('Failed to change PWM:', err);
    }
  };

  const handleBoost = async () => {
    if (isBoostActive) return;
    
    setIsBoostActive(true);
    try {
      await boostHigh(roomId, 10);
    } catch (err) {
      console.error('Failed to activate boost:', err);
    }
    setTimeout(() => setIsBoostActive(false), 2000);
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    if (logs.length === 0) {
      return {
        avgFanPWM: 0,
        fanRuntime: 0,
        energySaved: 0,
        dataPoints: 0,
        lastUpdate: null,
        warnings: []
      };
    }

    let totalPWM = 0;
    let fanOnTime = 0;
    let totalDuration = 0;
    let pwmSumWhileOn = 0;
    const warnings: string[] = [];
    
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      // Validate data and collect warnings
      const logWarnings = validateClimateData(log);
      warnings.push(...logWarnings);
      
      if (log.fan?.pwm !== undefined) {
        totalPWM += log.fan.pwm;
      }
      
      if (log.fan?.on && log.fan?.pwm) {
        const duration = i < logs.length - 1 ? 
          Math.max(0, (logs[i + 1].timestamp || 0) - (log.timestamp || 0)) / 1000 / 60 : // minutes
          1; // assume 1 minute for last entry
        
        fanOnTime += duration;
        pwmSumWhileOn += log.fan.pwm * duration;
      }
      
      if (i < logs.length - 1) {
        totalDuration += Math.max(0, (logs[i + 1].timestamp || 0) - (log.timestamp || 0)) / 1000 / 60;
      }
    }

    const avgFanPWM = logs.length > 0 ? totalPWM / logs.length : 0;
    const baselineEnergy = totalDuration * 255; // Always HIGH
    const actualEnergy = pwmSumWhileOn;
    const energySaved = baselineEnergy > 0 ? ((baselineEnergy - actualEnergy) / baselineEnergy) * 100 : 0;
    
    const lastUpdate = Math.max(
      state?.updatedAt || 0,
      ...logs.map(log => log.timestamp || 0)
    );

    return {
      avgFanPWM: Math.round(avgFanPWM),
      fanRuntime: Math.round(fanOnTime),
      energySaved: Math.round(energySaved * 10) / 10,
      dataPoints: logs.length,
      lastUpdate: lastUpdate > 0 ? lastUpdate : null,
      warnings: [...new Set(warnings)] // Remove duplicates
    };
  }, [logs, state]);

  // Chart data
  const chartData = useMemo(() => {
    if (logs.length === 0) return null;

    const last50Logs = logs.slice(-50); // Show last 50 data points
    const labels = last50Logs.map(log => 
      log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''
    );

    return {
      labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: last50Logs.map(log => log.tempC || null),
          borderColor: '#10b981', // green
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Fan PWM',
          data: last50Logs.map(log => log.fan?.pwm || null),
          borderColor: '#8b5cf6', // purple
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    };
  }, [logs]);

  const aqChartData = useMemo(() => {
    if (logs.length === 0) return null;

    const last50Logs = logs.slice(-50);
    const labels = last50Logs.map(log => 
      log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''
    );

    return {
      labels,
      datasets: [
        {
          label: 'Air Quality (Raw)',
          data: last50Logs.map(log => log.aqRaw || null),
          borderColor: '#f97316', // orange
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          tension: 0.4
        }
      ]
    };
  }, [logs]);

  const handleExportCSV = () => {
    const csv = toCSV(logs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climate-data-${roomId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Connection status
  const isConnected = state && state.updatedAt && (Date.now() - state.updatedAt) < 30000; // 30 seconds

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🌡️ Smart Classroom Climate Control</h1>
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

      {error && (
        <div className="error-banner">
          ❌ {error}
        </div>
      )}

      {activeTab === 'live' && (
        <div className="live-control">
          {loading ? (
            <div className="loader">
              <div className="spinner"></div>
              <p>Connecting to climate system...</p>
            </div>
          ) : (
            <>
              {/* Live Data Display */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>🌡️ Temperature</h4>
                  <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 'bold' }}>
                    {state?.tempC?.toFixed(1) || '--'}°C
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                    {comfortBand(state?.tempC)}
                  </div>
                </div>

                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>💧 Humidity</h4>
                  <div style={{ fontSize: '1.5rem', color: '#3b82f6', fontWeight: 'bold' }}>
                    {state?.humidity?.toFixed(1) || '--'}%
                  </div>
                </div>

                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>🌪️ Air Quality</h4>
                  <div style={{ fontSize: '1.5rem', color: '#f97316', fontWeight: 'bold' }}>
                    {state?.aqRaw || '--'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                    {state?.aqStatus || deriveAQStatus(state?.aqRaw)}
                  </div>
                </div>

                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>🌊 Fan Status</h4>
                  <div style={{ fontSize: '1.5rem', color: state?.fan?.on ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    {state?.fan?.on ? 'ON' : 'OFF'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                    PWM: {state?.fan?.pwm || 0}/255
                  </div>
                </div>

                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>⚙️ Mode</h4>
                  <div style={{ fontSize: '1.5rem', color: '#8b5cf6', fontWeight: 'bold' }}>
                    {state?.mode || 'Unknown'}
                  </div>
                </div>

                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>👥 Presence</h4>
                  <div style={{ fontSize: '1.5rem', color: state?.presence ? '#10b981' : '#6b7280', fontWeight: 'bold' }}>
                    {state?.presence ? 'Detected' : 'None'}
                  </div>
                </div>
              </div>

              {/* Control Panel */}
              <div className="mode-control">
                <h3>Control Panel</h3>
                
                {/* Mode Control */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Mode</h4>
                  <div className="mode-switch">
                    <button 
                      className={state?.mode === 'Auto' ? 'active' : ''}
                      onClick={() => handleModeChange('Auto')}
                      disabled={isChangingMode}
                    >
                      {isChangingMode && state?.mode === 'Auto' ? '...' : 'Auto'}
                    </button>
                    <button 
                      className={state?.mode === 'Manual' ? 'active' : ''}
                      onClick={() => handleModeChange('Manual')}
                      disabled={isChangingMode}
                    >
                      {isChangingMode && state?.mode === 'Manual' ? '...' : 'Manual'}
                    </button>
                  </div>
                </div>

                {/* Manual Fan Controls */}
                {state?.mode === 'Manual' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Manual Fan Control</h4>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                      <button 
                        onClick={handleFanToggle}
                        disabled={isChangingFan}
                        style={{
                          background: state?.fan?.on ? '#10b981' : '#ef4444',
                          border: 'none',
                          color: 'white',
                          padding: '0.8rem 1.5rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {isChangingFan ? '...' : (state?.fan?.on ? 'Turn OFF' : 'Turn ON')}
                      </button>
                    </div>

                    <div>
                      <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                        PWM Speed: {state?.fan?.pwm || 0}/255
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={state?.fan?.pwm || 0}
                        onChange={(e) => handlePWMChange(parseInt(e.target.value))}
                        disabled={!state?.fan?.on}
                        style={{
                          width: '100%',
                          height: '8px',
                          borderRadius: '4px',
                          background: '#374151',
                          outline: 'none',
                          opacity: state?.fan?.on ? 1 : 0.5
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Boost Control */}
                <div>
                  <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Boost Mode</h4>
                  <button
                    onClick={handleBoost}
                    disabled={isBoostActive}
                    style={{
                      background: '#f59e0b',
                      border: 'none',
                      color: 'white',
                      padding: '0.8rem 1.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      opacity: isBoostActive ? 0.5 : 1
                    }}
                  >
                    {isBoostActive ? 'Boost Activated...' : 'Boost 10 min'}
                  </button>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
                    Force HIGH speed for 10 minutes, then return to previous mode
                  </p>
                </div>
              </div>

              {/* Last Update */}
              {state?.updatedAt && (
                <div style={{ 
                  textAlign: 'center', 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: '0.9rem',
                  marginTop: '1rem'
                }}>
                  Last update: {new Date(state.updatedAt).toLocaleString()}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div style={{ padding: '2rem' }}>
          {/* KPI Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>📊 Avg Fan PWM</h4>
              <div style={{ fontSize: '1.5rem', color: '#8b5cf6', fontWeight: 'bold' }}>
                {analytics.avgFanPWM}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>⏱️ Fan Runtime</h4>
              <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 'bold' }}>
                {analytics.fanRuntime} min
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>⚡ Energy Saved</h4>
              <div style={{ fontSize: '1.5rem', color: '#f59e0b', fontWeight: 'bold' }}>
                {analytics.energySaved}%
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>📈 Data Points</h4>
              <div style={{ fontSize: '1.5rem', color: '#3b82f6', fontWeight: 'bold' }}>
                {analytics.dataPoints}
              </div>
            </div>
          </div>

          {/* Charts */}
          {chartData && (
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '1.5rem', 
              borderRadius: '8px',
              marginBottom: '2rem'
            }}>
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>📈 Temperature & Fan Speed Trends</h3>
              <div style={{ height: '400px' }}>
                <Line 
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: { color: 'white' }
                      }
                    },
                    scales: {
                      x: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                      },
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        title: { display: true, text: 'Temperature (°C)', color: 'white' }
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: { color: 'white' },
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Fan PWM', color: 'white' }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {aqChartData && (
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '1.5rem', 
              borderRadius: '8px',
              marginBottom: '2rem'
            }}>
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>🌪️ Air Quality Trends</h3>
              <div style={{ height: '300px' }}>
                <Line 
                  data={aqChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: { color: 'white' }
                      }
                    },
                    scales: {
                      x: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                      },
                      y: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        title: { display: true, text: 'Air Quality (Raw)', color: 'white' }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {analytics.warnings.length > 0 && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.2)', 
              border: '1px solid #ef4444',
              padding: '1rem', 
              borderRadius: '8px',
              marginBottom: '2rem'
            }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem 0' }}>⚠️ Data Validation Warnings</h4>
              <ul style={{ color: '#ef4444', margin: 0, paddingLeft: '1.5rem' }}>
                {analytics.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Export Controls */}
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '1.5rem', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>📊 Data Export</h3>
            <button
              onClick={handleExportCSV}
              style={{
                background: '#3b82f6',
                border: 'none',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginRight: '1rem'
              }}
            >
              📄 Export CSV
            </button>
            
            <div style={{ 
              color: 'rgba(255,255,255,0.7)', 
              fontSize: '0.9rem',
              marginTop: '1rem'
            }}>
              Export includes: timestamp, temperature, humidity, mode, fan state, air quality, presence
              <br />
              {analytics.lastUpdate && (
                <>Last update: {new Date(analytics.lastUpdate).toLocaleString()}</>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
