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

  useEffect(() => {
    const logsRef = ref(database, `/lighting/${ROOM_ID}/logs`);
    const recentLogsQuery = query(logsRef, orderByKey(), limitToLast(1000));

    const unsubscribe = onValue(recentLogsQuery, (snapshot) => {
      const data = snapshot.val();
      console.log('📊 Raw log data from Firebase:', data); // Debug log
      
      if (data) {
        const logsArray = Object.values(data).map((rawLog: any) => {
          // Handle ESP32 nested log structure
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
        
        console.log('📊 Processed logs:', logsArray.slice(0, 3)); // Debug: show first 3
        setLogs(logsArray.sort((a, b) => a.ts - b.ts));
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Daily Brightness Line Chart
  const getBrightnessChart = () => {
    const last24Hours = logs.filter(log => 
      dayjs().diff(dayjs(log.ts), 'hour') <= 24
    );

    return {
      labels: last24Hours.map(log => dayjs(log.ts).format('HH:mm')),
      datasets: [
        {
          label: 'Brightness Level (LDR Raw)',
          data: last24Hours.map(log => log.ldrRaw),
          borderColor: 'rgb(255, 206, 84)',
          backgroundColor: 'rgba(255, 206, 84, 0.2)',
          tension: 0.1,
        },
      ],
    };
  };

  // 2. Presence Heatmap/Bar (detections per hour)
  const getPresenceChart = () => {
    const hourlyPresence: { [hour: string]: number } = {};
    
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
      runtimePercent: Math.round((onMinutes / totalMinutes) * 100),
    };
  };

  // 4. Energy Saved vs Baseline
  const getEnergySavings = () => {
    const occupiedLogs = logs.filter(log => log.presence);
    const actualUsage = logs.reduce((sum, log) => sum + (log.led?.on ? (log.led?.pwm || 0) / 255 : 0), 0);
    const baselineUsage = occupiedLogs.length; // Always ON at PWM=255 when occupied
    const savings = baselineUsage > 0 ? ((baselineUsage - actualUsage) / baselineUsage) * 100 : 0;

    return {
      actualUsage: Math.round(actualUsage * 10), // Watts
      baselineUsage: Math.round(baselineUsage * 10),
      savings: Math.round(savings),
      savedWatts: Math.round((baselineUsage - actualUsage) * 10),
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
            <code>/lighting/roomA/logs</code>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
            💡 The system logs data every 30 seconds when running<br/>
            🔧 Check browser console (F12) for debug logs<br/>
            📍 Make sure ESP32 is uploading and logging data
          </div>
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem' }}>
            <strong>Troubleshooting:</strong><br/>
            1. ESP32 should show "📊 Data record #X logged" messages<br/>
            2. Check Firebase console for data at the logs path<br/>
            3. Wait 1-2 minutes for initial log entries to accumulate
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
        <button onClick={exportToCSV} className="export-btn">
          📥 Export CSV
        </button>
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
          <div className="stat-subtitle">{energyStats.savedWatts}W saved</div>
        </div>
        <div className="stat-card">
          <h3>📈 Data Points</h3>
          <div className="stat-value">{logs.length}</div>
          <div className="stat-subtitle">log entries</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>📈 Daily Brightness Levels</h3>
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
          <h3>👤 Presence Detection by Hour</h3>
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