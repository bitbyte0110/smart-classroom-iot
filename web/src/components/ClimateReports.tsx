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

interface ClimateLog {
  ts: number;
  tempC: number;
  humidity: number;
  aqRaw: number;
  aqStatus: string;
  fanOn: boolean;
  fanPwm: number;
  comfortBand: string;
  mode: string;
  presence: boolean;
}



export default function ClimateReports() {
  const [logs, setLogs] = useState<ClimateLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    console.log('🌡️ Climate Reports component mounted, connecting to Firebase...');
    console.log('🎯 Using ONLY Combined Logs data for historical charts:', `/combined/${ROOM_ID}/logs`);
    
    // Use ONLY combined logs for historical data - no fallback to single data points
    const combinedLogsRef = ref(database, `/combined/${ROOM_ID}/logs`);
    
    const unsubscribe = onValue(combinedLogsRef, (snapshot) => {
      const logsData = snapshot.val();
      console.log('🌡️ Raw combined logs data from Firebase:', logsData);
      
      if (logsData) {
        // Convert combined logs to ClimateLog format
        const climateLogs: ClimateLog[] = Object.values(logsData)
          .filter((log: unknown): log is Record<string, unknown> => log !== null && typeof log === 'object')
          .map((log: Record<string, unknown>) => {
            const climate = (log.climate as Record<string, unknown>) || {};
            const ai = (log.ai as Record<string, unknown>) || {};
            
            return {
              ts: (log.timestamp as number) || (log.ts as number) || Date.now(),
              tempC: (climate.tempC as number) || 0,
              humidity: (climate.humidity as number) || 0,
              aqRaw: (climate.aqRaw as number) || 0,
              aqStatus: (climate.aqStatus as string) || 'Good',
              fanOn: (climate.fanOn as boolean) || false,
              fanPwm: (climate.fanPwm as number) || 0,
              comfortBand: (climate.comfortBand as string) || 'Moderate',
              mode: (climate.mode as string) || 'auto',
              presence: (ai.presence as boolean) || false
            };
          })
          .sort((a, b) => a.ts - b.ts); // Sort by timestamp
        
        console.log('🌡️ Processed climate logs from combined data:', climateLogs);
        setLogs(climateLogs);
        setIsLoading(false);
        console.log('🌡️ Using HISTORICAL data from combined logs');
        return;
      }
      
      // If no combined logs, show no data message
      console.log('🌡️ No combined logs found - showing no data message');
      setLogs([]);
      setIsLoading(false);
    }, (error) => {
      console.error('🌡️ Firebase error for combined logs:', error);
      setLogs([]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Temperature Chart
  const getTemperatureChart = () => {
    let filteredLogs;
    
    if (demoMode) {
      filteredLogs = logs.filter(log => 
        dayjs().diff(dayjs(log.ts), 'minute') <= 10
      );
    } else {
      filteredLogs = logs.filter(log => 
        dayjs().diff(dayjs(log.ts), 'hour') <= 24
      );
    }

    return {
      labels: filteredLogs.map(log => dayjs(log.ts).format('HH:mm')),
      datasets: [
        {
          label: 'Temperature (°C)',
          data: filteredLogs.map(log => log.tempC),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
        },
        {
          label: 'Humidity (%)',
          data: filteredLogs.map(log => log.humidity),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1,
          yAxisID: 'y1',
        },
      ],
    };
  };

  // Air Quality Chart
  const getAirQualityChart = () => {
    let filteredLogs;
    
    if (demoMode) {
      filteredLogs = logs.filter(log => 
        dayjs().diff(dayjs(log.ts), 'minute') <= 10
      );
    } else {
      filteredLogs = logs.filter(log => 
        dayjs().diff(dayjs(log.ts), 'hour') <= 24
      );
    }

    return {
      labels: filteredLogs.map(log => dayjs(log.ts).format('HH:mm')),
      datasets: [
        {
          label: 'Air Quality (Raw)',
          data: filteredLogs.map(log => log.aqRaw),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
        },
      ],
    };
  };

  // Fan Usage Chart
  const getFanUsageChart = () => {
    const hourlyFanUsage: { [time: string]: number } = {};
    
    if (demoMode) {
      const last10Minutes = logs.filter(log => 
        dayjs().diff(dayjs(log.ts), 'minute') <= 10
      );
      
      last10Minutes.forEach(log => {
        const minute = dayjs(log.ts).format('HH:mm');
        if (!hourlyFanUsage[minute]) hourlyFanUsage[minute] = 0;
        if (log.fanOn) hourlyFanUsage[minute]++;
      });

      const minutes = Array.from({ length: 10 }, (_, i) => {
        const time = dayjs().subtract(9 - i, 'minute');
        return time.format('HH:mm');
      });
      
      return {
        labels: minutes,
        datasets: [
          {
            label: 'Fan Usage (Last 10 min)',
            data: minutes.map(minute => hourlyFanUsage[minute] || 0),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          },
        ],
      };
    } else {
      logs.forEach(log => {
        const hour = dayjs(log.ts).format('HH:00');
        if (!hourlyFanUsage[hour]) hourlyFanUsage[hour] = 0;
        if (log.fanOn) hourlyFanUsage[hour]++;
      });

      const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
      
      return {
        labels: hours,
        datasets: [
          {
            label: 'Fan Usage by Hour',
            data: hours.map(hour => hourlyFanUsage[hour] || 0),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          },
        ],
      };
    }
  };

  // Climate Statistics
  const getClimateStats = () => {
    // If we have logs, use them for historical data
    if (logs.length > 0) {
      const fanLogs = logs.filter(log => log.fanOn);
      const totalMinutes = (logs.length * 30) / 60; // 30 seconds per log
      const fanMinutes = (fanLogs.length * 30) / 60;
      const avgTemp = logs.reduce((sum, log) => sum + log.tempC, 0) / logs.length;
      const avgHumidity = logs.reduce((sum, log) => sum + log.humidity, 0) / logs.length;
      const avgAQ = logs.reduce((sum, log) => sum + log.aqRaw, 0) / logs.length;

      return {
        totalMinutes: Math.round(totalMinutes),
        fanMinutes: Math.round(fanMinutes),
        fanUsagePercent: totalMinutes > 0 ? Math.round((fanMinutes / totalMinutes) * 100) : 0,
        avgTemp: Math.round(avgTemp * 10) / 10,
        avgHumidity: Math.round(avgHumidity * 10) / 10,
        avgAQ: Math.round(avgAQ),
      };
    }
    
    // Fallback to zero values
    return {
      totalMinutes: 0,
      fanMinutes: 0,
      fanUsagePercent: 0,
      avgTemp: 0,
      avgHumidity: 0,
      avgAQ: 0,
    };
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Air Quality', 'Fan On', 'Fan PWM', 'Comfort Band', 'Mode', 'Presence'],
      ...logs.map(log => [
        new Date(log.ts).toISOString(),
        log.tempC,
        log.humidity,
        log.aqRaw,
        log.fanOn,
        log.fanPwm,
        log.comfortBand,
        log.mode,
        log.presence
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climate-logs-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="reports loading">Loading climate reports...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="reports">
        <div className="reports-header">
          <h2>🌡️ Climate Analytics & Reports</h2>
        </div>
        <div className="stat-card" style={{ margin: '2rem auto', maxWidth: '500px' }}>
          <h3>🌡️ No Climate Data Available</h3>
          <div className="stat-value">0</div>
          <div className="stat-subtitle">
            Reports will appear once your ESP32 starts logging climate data to Firebase at<br/>
            <code>/combined/roomA/logs</code> (for historical data) or <code>/climate/roomA/state</code> (for current data)
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
            💡 The system logs data every 10 seconds when running<br/>
            🔧 Check browser console (F12) for debug logs<br/>
            📍 Make sure ESP32 is uploading and logging data
          </div>
        </div>
      </div>
    );
  }

  const climateStats = getClimateStats();

  return (
    <div className="reports">
      <div className="reports-header">
        <h2>🌡️ Climate Analytics & Reports</h2>
        <div className="header-controls">
          <div style={{ fontSize: '0.8rem', color: '#5a6c7d', marginRight: '1rem' }}>
            Historical data from combined logs
          </div>
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
          <h3>🌡️ Avg Temperature</h3>
          <div className="stat-value">{climateStats.avgTemp}°C</div>
          <div className="stat-subtitle">
            {logs.length > 0 ? 'Historical average' : 'No data'}
          </div>
        </div>
        <div className="stat-card">
          <h3>💧 Avg Humidity</h3>
          <div className="stat-value">{climateStats.avgHumidity}%</div>
          <div className="stat-subtitle">
            {logs.length > 0 ? 'Historical average' : 'No data'}
          </div>
        </div>
        <div className="stat-card">
          <h3>🌬️ Fan Usage</h3>
          <div className="stat-value">{climateStats.fanUsagePercent}%</div>
          <div className="stat-subtitle">
            {logs.length > 0 ? `${climateStats.fanMinutes} min total` : 'No data'}
          </div>
        </div>
        <div className="stat-card">
          <h3>🌪️ Air Quality</h3>
          <div className="stat-value">{climateStats.avgAQ}</div>
          <div className="stat-subtitle">
            {logs.length > 0 ? 'avg raw reading' : 'No data'}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>🌡️ Temperature & Humidity {demoMode ? '(Last 10 min)' : '(24h data)'}</h3>
          {logs.length >= 2 ? (
            <Line 
              data={getTemperatureChart()} 
              options={{
                responsive: true,
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Temperature (°C)' }
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Humidity (%)' },
                    grid: { drawOnChartArea: false },
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
          <h3>🌪️ Air Quality {demoMode ? '(Last 10 min)' : '(24h data)'}</h3>
          {logs.length >= 2 ? (
            <Line 
              data={getAirQualityChart()} 
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Air Quality Raw Value' }
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
          <h3>🌬️ Fan Usage {demoMode ? '(Last 10 min)' : 'by Hour'}</h3>
          {logs.length >= 2 ? (
            <Bar 
              data={getFanUsageChart()} 
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Usage Count' }
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