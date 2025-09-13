import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import dayjs from 'dayjs';
import { database } from '../firebase';
import type { LightingLog } from '../types';
import { ROOM_ID } from '../types';
import './Reports.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Reports() {
  const [logs, setLogs] = useState<LightingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    console.log('📊 Reports component mounted, connecting to Firebase...');
    console.log('🎯 Using ONLY Combined Logs data for historical charts:', `/combined/${ROOM_ID}/logs`);
    
    // Use ONLY combined logs for historical data - no fallback to single data points
    const combinedLogsRef = ref(database, `/combined/${ROOM_ID}/logs`);
    
    const unsubscribe = onValue(combinedLogsRef, (snapshot) => {
      const logsData = snapshot.val();
      console.log('📊 Raw combined logs data from Firebase:', logsData);
      
      if (logsData) {
        // Convert combined logs to LightingLog format
        const lightingLogs: LightingLog[] = Object.values(logsData)
          .filter((log: unknown): log is Record<string, unknown> => log !== null && typeof log === 'object')
          .map((log: Record<string, unknown>) => {
            const lighting = (log.lighting as Record<string, unknown>) || {};
            const ai = (log.ai as Record<string, unknown>) || {};
            
            return {
              ts: (log.timestamp as number) || (log.ts as number) || Date.now(),
              presence: (ai.presence as boolean) || false,
              ldrRaw: Number.isFinite(lighting.ldr as number) ? (lighting.ldr as number) : 0,
              mode: ((lighting.mode as string) === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual',
              led: {
                on: Boolean(lighting.ledOn as boolean),
                pwm: Number.isFinite(lighting.ledPWM as number) ? (lighting.ledPWM as number) : 0
              },
              sensorError: null // No sensor error in combined logs
            };
          })
          .sort((a, b) => a.ts - b.ts); // Sort by timestamp
        
        console.log('📊 Processed lighting logs from combined data:', lightingLogs);
        setLogs(lightingLogs);
        setIsLoading(false);
        console.log('📊 Using HISTORICAL data from combined logs');
        return;
      }
      
      // If no combined logs, show no data message
      console.log('📊 No combined logs found - showing no data message');
      setLogs([]);
      setIsLoading(false);
    }, (error) => {
      console.error('📊 Firebase error for combined logs:', error);
      setLogs([]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Daily Brightness Line Chart (Updates every 5 seconds for demo)
  // Note: ESP32 logs every 30s, but chart refreshes every 5s for smoother demo
  const getBrightnessChart = () => {
    let filteredLogs;
    
    if (demoMode) {
      // Demo mode: show last 10 minutes for faster updates
      filteredLogs = logs.filter(log => 
        dayjs().diff(dayjs(log.ts), 'minute') <= 10
      );
    } else {
      // Normal mode: show last 24 hours
      filteredLogs = logs.filter(log => 
        dayjs().diff(dayjs(log.ts), 'hour') <= 24
      );
    }

    // Only show charts if we have multiple data points (historical data)
    if (filteredLogs.length < 2) {
      return {
        labels: [],
        datasets: []
      };
    }

    return {
      labels: filteredLogs.map(log => dayjs(log.ts).format('HH:mm')),
      datasets: [
        {
          label: 'Brightness Level (LDR Raw)',
          data: filteredLogs.map(log => log.ldrRaw),
          borderColor: 'rgb(255, 206, 84)',
          backgroundColor: 'rgba(255, 206, 84, 0.2)',
          tension: 0.1,
        },
      ],
    };
  };

  // 2. Presence Heatmap/Bar (detections per hour or minute for demo)
  const getPresenceChart = () => {
    const hourlyPresence: { [time: string]: number } = {};
    
    // Only show charts if we have multiple data points (historical data)
    if (logs.length < 2) {
      return {
        labels: [],
        datasets: []
      };
    }
    
    if (demoMode) {
      // Demo mode: show detections per minute for last 10 minutes
      const last10Minutes = logs.filter(log => 
        dayjs().diff(dayjs(log.ts), 'minute') <= 10
      );
      
      last10Minutes.forEach(log => {
        const minute = dayjs(log.ts).format('HH:mm');
        if (!hourlyPresence[minute]) hourlyPresence[minute] = 0;
        if (log.presence) hourlyPresence[minute]++;
      });

      // Generate last 10 minutes labels
      const minutes = Array.from({ length: 10 }, (_, i) => {
        const time = dayjs().subtract(9 - i, 'minute');
        return time.format('HH:mm');
      });
      
      return {
        labels: minutes,
        datasets: [
          {
            label: 'Presence Detections (Last 10 min)',
            data: minutes.map(minute => hourlyPresence[minute] || 0),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      };
    } else {
      // Normal mode: show detections per hour
      logs.forEach(log => {
        const hour = dayjs(log.ts).format('HH:00');
        if (!hourlyPresence[hour]) hourlyPresence[hour] = 0;
        if (log.presence) hourlyPresence[hour]++;
      });

      const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
      
      return {
        labels: hours,
        datasets: [
          {
            label: 'Presence Detections',
            data: hours.map(hour => hourlyPresence[hour] || 0),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      };
    }
  };

  // 3. LED Runtime & Average PWM
  const getLEDStats = () => {
    const onLogs = logs.filter(log => log.led?.on);
    const totalMinutes = (logs.length * 30) / 60; // 30 seconds per log (ESP32 logs every 30s)
    const onMinutes = (onLogs.length * 30) / 60;
    const avgPWM = onLogs.length > 0 
      ? onLogs.reduce((sum, log) => sum + (log.led?.pwm || 0), 0) / onLogs.length 
      : 0;

    return {
      totalMinutes: Math.round(totalMinutes),
      onMinutes: Math.round(onMinutes),
      avgPWM: Math.round(avgPWM),
      runtimePercent: totalMinutes > 0 ? Math.round((onMinutes / totalMinutes) * 100) : 0,
    };
  };

  // 4. Energy Saved vs Baseline (Tiny 3.3V IoT LED)
  const getEnergySavings = () => {
    const occupiedLogs = logs.filter(log => log.presence);
    const onLogs = logs.filter(log => log.led?.on);
    
    // Realistic power calculations for tiny 3.3V IoT LED
    const LED_POWER_MW = 20; // 20mW typical for tiny IoT LED (3.3V, ~6mA)
    const LED_MAX_POWER_MW = 20; // 20mW at full brightness
    
    // Calculate actual power usage based on PWM (in mW)
    const actualPower = onLogs.reduce((sum, log) => {
      const pwmRatio = (log.led?.pwm || 0) / 255;
      return sum + (LED_POWER_MW * pwmRatio);
    }, 0);
    
    // Baseline: LED always on at full power when occupied (in mW)
    const baselinePower = occupiedLogs.length * LED_MAX_POWER_MW;
    
    const savings = baselinePower > 0 ? ((baselinePower - actualPower) / baselinePower) * 100 : 0;
    const savedWatts = baselinePower - actualPower;

    return {
      actualUsage: Math.round(actualPower), // Already in mW
      baselineUsage: Math.round(baselinePower),
      savings: Math.round(savings),
      savedWatts: Math.round(savedWatts), // Already in mW
    };
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Timestamp', 'Presence', 'LDR Raw', 'Mode', 'LED On', 'LED PWM', 'Sensor Error'],
      ...logs.map(log => [
        new Date(log.ts).toISOString(),
        log.presence,
        log.ldrRaw,
        log.mode,
        log.led.on,
        log.led.pwm,
        log.sensorError || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lighting-logs-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="reports loading">Loading reports...</div>;
  }

  // Debug: Show basic info even with no data
  if (logs.length === 0) {
    return (
      <div className="reports">
        <div className="reports-header">
          <h2>📊 Analytics & Reports</h2>
        </div>
        <div className="stat-card" style={{ margin: '2rem auto', maxWidth: '500px' }}>
          <h3>📊 No Data Available</h3>
          <div className="stat-value">0</div>
          <div className="stat-subtitle">
            Reports will appear once your ESP32 starts logging data to Firebase at<br/>
            <code>/combined/roomA/logs</code> (for historical data) or <code>/lighting/roomA/state</code> (for current data)
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
            💡 The system logs data every 30 seconds when running<br/>
            🔧 Check browser console (F12) for debug logs<br/>
            📍 Make sure ESP32 is uploading and logging data
          </div>
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem' }}>
            <strong>Troubleshooting:</strong><br/>
            1. ESP32 should show "📊 Combined data record #X logged" messages<br/>
            2. Check Firebase console for data at /combined/roomA/logs<br/>
            3. Wait 1-2 minutes for initial log entries to accumulate<br/>
            4. Check browser console (F12) for debug logs
          </div>
        </div>
      </div>
    );
  }

  const ledStats = getLEDStats();
  const energyStats = getEnergySavings();

  return (
    <div className="reports">
      <div className="reports-header">
        <h2>📊 Analytics & Reports</h2>
        <div className="header-controls">
          {logs.length === 1 && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#27ae60', 
              marginRight: '1rem',
              padding: '0.3rem 0.6rem',
              backgroundColor: 'rgba(39, 174, 96, 0.1)',
              borderRadius: '4px',
              border: '1px solid rgba(39, 174, 96, 0.3)'
            }}>
              🔴 LIVE DATA (Real-time from ESP32)
            </div>
          )}
          <button 
            onClick={() => setDemoMode(!demoMode)} 
            className={`demo-toggle ${demoMode ? 'active' : ''}`}
          >
            {demoMode ? '⏱️ Last 10 min' : '📊 Full Data (24h)'}
          </button>
          <button onClick={exportToCSV} className="export-btn">
            📥 Export CSV
          </button>
        </div>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <h3>💡 LED Runtime</h3>
          <div className="stat-value">{ledStats.onMinutes} min</div>
          <div className="stat-subtitle">{ledStats.runtimePercent}% of total time</div>
        </div>
        <div className="stat-card">
          <h3>⚡ Avg PWM</h3>
          <div className="stat-value">{ledStats.avgPWM}</div>
          <div className="stat-subtitle">out of 255 max</div>
        </div>
        <div className="stat-card">
          <h3>💚 Energy Saved</h3>
          <div className="stat-value">{energyStats.savings}%</div>
          <div className="stat-subtitle">{energyStats.savedWatts}mW saved</div>
        </div>
        <div className="stat-card">
          <h3>📈 Data Points</h3>
          <div className="stat-value">{logs.length}</div>
          <div className="stat-subtitle">log entries</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>📈 Daily Brightness Levels {demoMode ? '(Last 10 min)' : '(24h data)'}</h3>
          {logs.length >= 2 ? (
            <Line 
              data={getBrightnessChart()} 
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 4095,
                    title: { display: true, text: 'LDR Raw Value' }
                  }
                }
              }} 
            />
          ) : (
            <div style={{ 
              padding: '2rem', 
              textAlign: 'center', 
              color: '#5a6c7d',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e1e8ed'
            }}>
              <p>📊 No historical data available</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Charts will appear once multiple data points are logged
              </p>
            </div>
          )}
        </div>

        <div className="chart-container">
          <h3>👤 Presence Detection {demoMode ? '(Last 10 min)' : 'by Hour'}</h3>
          {logs.length >= 2 ? (
            <Bar 
              data={getPresenceChart()} 
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Detection Count' }
                  }
                }
              }} 
            />
          ) : (
            <div style={{ 
              padding: '2rem', 
              textAlign: 'center', 
              color: '#5a6c7d',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e1e8ed'
            }}>
              <p>📊 No historical data available</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Charts will appear once multiple data points are logged
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}