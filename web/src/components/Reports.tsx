import { useState, useEffect } from 'react';
import { ref, query, orderByKey, limitToLast, onValue } from 'firebase/database';
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
    // Try combined logs first (new system), fallback to lighting logs (old system)
    const combinedLogsRef = ref(database, `/combined/${ROOM_ID}/logs`);
    const lightingLogsRef = ref(database, `/lighting/${ROOM_ID}/logs`);
    const recentLogsQuery = query(combinedLogsRef, orderByKey(), limitToLast(1000));

    const unsubscribe = onValue(recentLogsQuery, (snapshot) => {
      const data = snapshot.val();
      console.log('📊 Raw combined log data from Firebase:', data); // Debug log
      
      if (data) {
        const logsArray = Object.values(data).map((rawLog: any) => {
          // Handle combined ESP32 log structure
          const log: LightingLog = {
            ts: rawLog.timestamp || rawLog.ts || Date.now(),
            presence: rawLog.ai?.presence || rawLog.lighting?.ai_presence || false,
            ldrRaw: rawLog.lighting?.ldr || rawLog.lighting?.ldrRaw || 0,
            mode: rawLog.lighting?.mode || 'auto',
            led: {
              on: rawLog.lighting?.ledOn || false,
              pwm: rawLog.lighting?.ledPWM || 0
            },
            sensorError: rawLog.system?.status || null
          };
          return log;
        }) as LightingLog[];
        
        console.log('📊 Processed combined logs:', logsArray.slice(0, 3)); // Debug: show first 3
        setLogs(logsArray.sort((a, b) => a.ts - b.ts));
        setIsLoading(false);
        return;
      }
      
      // Fallback: try old lighting logs if combined logs are empty
      console.log('📊 No combined logs found, trying old lighting logs...');
      const fallbackQuery = query(lightingLogsRef, orderByKey(), limitToLast(1000));
      onValue(fallbackQuery, (fallbackSnapshot) => {
        const fallbackData = fallbackSnapshot.val();
        console.log('📊 Raw lighting log data from Firebase:', fallbackData);
        
        if (fallbackData) {
          const logsArray = Object.values(fallbackData).map((rawLog: any) => {
            // Handle old ESP32 nested log structure
            const log: LightingLog = {
              ts: rawLog.timestamp || rawLog.ts || Date.now(),
              presence: rawLog.ai?.presence || rawLog.presence || false,
              ldrRaw: rawLog.sensors?.ldr || rawLog.ldrRaw || 0,
              mode: rawLog.system?.mode || rawLog.mode || 'auto',
              led: {
                on: rawLog.actuators?.ledOn || rawLog.led?.on || false,
                pwm: rawLog.actuators?.ledPWM || rawLog.led?.pwm || 0
              },
              sensorError: rawLog.system?.status || rawLog.sensorError || null
            };
            return log;
          }) as LightingLog[];
          
          console.log('📊 Processed fallback logs:', logsArray.slice(0, 3));
          setLogs(logsArray.sort((a, b) => a.ts - b.ts));
        }
        setIsLoading(false);
      });
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
            <code>/combined/roomA/logs</code> (or <code>/lighting/roomA/logs</code> for old system)
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
        </div>

        <div className="chart-container">
          <h3>👤 Presence Detection {demoMode ? '(Last 10 min)' : 'by Hour'}</h3>
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
        </div>
      </div>
    </div>
  );
}