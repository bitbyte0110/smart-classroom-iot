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
import type { ClimateLog } from '../types';
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

export default function ClimateReports() {
  const [logs, setLogs] = useState<ClimateLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const logsRef = ref(database, `/climate/${ROOM_ID}/logs`);
    const recentLogsQuery = query(logsRef, orderByKey(), limitToLast(1000));

    const unsubscribe = onValue(recentLogsQuery, (snapshot) => {
      const data = snapshot.val();
      console.log('📊 Raw climate log data from Firebase:', data);
      
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logsArray = Object.values(data).map((rawLog: any) => {
          // Handle ESP32 nested log structure
          const processedLog: ClimateLog = {
            ts: rawLog.timestamp || rawLog.ts || Date.now(),
            presence: rawLog.ai?.presence || rawLog.presence || false,
            tempC: rawLog.sensors?.temperature || rawLog.tempC || 0,
            humidity: rawLog.sensors?.humidity || rawLog.humidity || 0,
            aqRaw: rawLog.sensors?.airQuality || rawLog.aqRaw || 0,
            aqStatus: rawLog.aqStatus || 'Good',
            mode: rawLog.system?.mode || rawLog.mode || 'auto',
            fan: {
              on: rawLog.actuators?.fanOn || rawLog.fan?.on || false,
              pwm: rawLog.actuators?.fanPWM || rawLog.fan?.pwm || 0
            },
            comfortBand: rawLog.comfortBand || 'Moderate',
            sensorError: rawLog.system?.status || rawLog.sensorError || null
          };
          return processedLog;
        }) as ClimateLog[];
        
        console.log('📊 Processed climate logs:', logsArray.slice(0, 3));
        setLogs(logsArray.sort((a, b) => a.ts - b.ts));
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Temperature and Humidity Line Chart
  const getTemperatureHumidityChart = () => {
    const last24Hours = logs.filter(log => 
      dayjs().diff(dayjs(log.ts), 'hour') <= 24
    );

    return {
      labels: last24Hours.map(log => dayjs(log.ts).format('HH:mm')),
      datasets: [
        {
          label: 'Temperature (°C)',
          data: last24Hours.map(log => log.tempC),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
          yAxisID: 'y',
        },
        {
          label: 'Humidity (%)',
          data: last24Hours.map(log => log.humidity),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1,
          yAxisID: 'y1',
        },
      ],
    };
  };

  // Air Quality Trends Chart
  const getAirQualityChart = () => {
    const last24Hours = logs.filter(log => 
      dayjs().diff(dayjs(log.ts), 'hour') <= 24
    );

    return {
      labels: last24Hours.map(log => dayjs(log.ts).format('HH:mm')),
      datasets: [
        {
          label: 'Air Quality (Raw)',
          data: last24Hours.map(log => log.aqRaw),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
        },
      ],
    };
  };

  // Fan Runtime Analysis Bar Chart
  const getFanRuntimeChart = () => {
    const hourlyData: { [hour: string]: { totalMinutes: number; avgPwm: number; count: number } } = {};
    
    logs.forEach(log => {
      const hour = dayjs(log.ts).format('HH:00');
      if (!hourlyData[hour]) {
        hourlyData[hour] = { totalMinutes: 0, avgPwm: 0, count: 0 };
      }
      
      if (log.fan.on) {
        hourlyData[hour].totalMinutes += 0.5; // 30-second intervals
        hourlyData[hour].avgPwm += log.fan.pwm;
        hourlyData[hour].count++;
      }
    });

    const hours = Object.keys(hourlyData).sort();
    
    return {
      labels: hours,
      datasets: [
        {
          label: 'Fan Runtime (Minutes)',
          data: hours.map(hour => hourlyData[hour].totalMinutes),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // Comfort Band Distribution
  const getComfortBandChart = () => {
    const bandCounts = { Low: 0, Moderate: 0, High: 0 };
    
    logs.forEach(log => {
      if (log.comfortBand in bandCounts) {
        bandCounts[log.comfortBand as keyof typeof bandCounts]++;
      }
    });

    return {
      labels: ['Low', 'Moderate', 'High'],
      datasets: [
        {
          label: 'Time Distribution',
          data: [bandCounts.Low, bandCounts.Moderate, bandCounts.High],
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // Calculate statistics
  const getStatistics = () => {
    if (logs.length === 0) return null;

    const fanOnLogs = logs.filter(log => log.fan.on);
    const avgTemp = logs.reduce((sum, log) => sum + log.tempC, 0) / logs.length;
    const avgHumidity = logs.reduce((sum, log) => sum + log.humidity, 0) / logs.length;
    const avgPwm = fanOnLogs.length > 0 ? 
      fanOnLogs.reduce((sum, log) => sum + log.fan.pwm, 0) / fanOnLogs.length : 0;
    
    const fanRuntimeMinutes = fanOnLogs.length * 0.5; // 30-second intervals
    const totalMinutes = logs.length * 0.5;
    const fanUsagePercent = totalMinutes > 0 ? (fanRuntimeMinutes / totalMinutes) * 100 : 0;

    // Energy calculation (assuming 5V DC fan, ~500mA max)
    const avgPowerW = (avgPwm / 255) * 2.5; // Max ~2.5W
    const energyUsedWh = (avgPowerW * fanRuntimeMinutes) / 60;

    return {
      dataPoints: logs.length,
      avgTemp: avgTemp.toFixed(1),
      avgHumidity: avgHumidity.toFixed(1),
      fanRuntime: fanRuntimeMinutes.toFixed(0),
      fanUsage: fanUsagePercent.toFixed(1),
      avgPwm: avgPwm.toFixed(0),
      energyUsed: energyUsedWh.toFixed(2),
    };
  };

  const stats = getStatistics();

  if (isLoading) {
    return (
      <div className="reports-loading">
        <div className="loader">
          <div className="spinner"></div>
          <p>Loading climate analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports">
      <h2>📊 Climate Control Analytics</h2>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>📈 Data Points</h3>
            <div className="stat-value">{stats.dataPoints}</div>
            <div className="stat-subtitle">Total records</div>
          </div>
          <div className="stat-card">
            <h3>🌡️ Avg Temperature</h3>
            <div className="stat-value">{stats.avgTemp}°C</div>
            <div className="stat-subtitle">24-hour average</div>
          </div>
          <div className="stat-card">
            <h3>💧 Avg Humidity</h3>
            <div className="stat-value">{stats.avgHumidity}%</div>
            <div className="stat-subtitle">24-hour average</div>
          </div>
          <div className="stat-card">
            <h3>🌪️ Fan Usage</h3>
            <div className="stat-value">{stats.fanUsage}%</div>
            <div className="stat-subtitle">{stats.fanRuntime} min runtime</div>
          </div>
          <div className="stat-card">
            <h3>⚡ Energy Used</h3>
            <div className="stat-value">{stats.energyUsed} Wh</div>
            <div className="stat-subtitle">Avg PWM: {stats.avgPwm}</div>
          </div>
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-container">
          <h3>🌡️ Temperature & Humidity Trends (24h)</h3>
          <Line 
            data={getTemperatureHumidityChart()} 
            options={{
              responsive: true,
              interaction: {
                mode: 'index' as const,
                intersect: false,
              },
              scales: {
                x: {
                  display: true,
                  title: {
                    display: true,
                    text: 'Time'
                  }
                },
                y: {
                  type: 'linear' as const,
                  display: true,
                  position: 'left' as const,
                  title: {
                    display: true,
                    text: 'Temperature (°C)'
                  }
                },
                y1: {
                  type: 'linear' as const,
                  display: true,
                  position: 'right' as const,
                  title: {
                    display: true,
                    text: 'Humidity (%)'
                  },
                  grid: {
                    drawOnChartArea: false,
                  },
                },
              },
            }} 
          />
        </div>

        <div className="chart-container">
          <h3>🌫️ Air Quality Trends (24h)</h3>
          <Line 
            data={getAirQualityChart()} 
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Air Quality (Raw)'
                  }
                }
              }
            }} 
          />
        </div>

        <div className="chart-container">
          <h3>🌪️ Fan Runtime Analysis (Hourly)</h3>
          <Bar 
            data={getFanRuntimeChart()} 
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Runtime (Minutes)'
                  }
                }
              }
            }} 
          />
        </div>

        <div className="chart-container">
          <h3>🎯 Comfort Band Distribution</h3>
          <Bar 
            data={getComfortBandChart()} 
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Number of Records'
                  }
                }
              }
            }} 
          />
        </div>
      </div>

      {stats && (
        <div className="export-section">
          <h3>📄 Data Export</h3>
          <p>Climate data: {stats.dataPoints} records collected</p>
          <button 
            onClick={() => {
              const csvData = [
                ['Timestamp', 'Temperature(°C)', 'Humidity(%)', 'AirQuality', 'AQStatus', 'FanOn', 'FanPWM', 'ComfortBand', 'Mode'],
                ...logs.map(log => [
                  new Date(log.ts).toISOString(),
                  log.tempC,
                  log.humidity,
                  log.aqRaw,
                  log.aqStatus,
                  log.fan.on,
                  log.fan.pwm,
                  log.comfortBand,
                  log.mode
                ])
              ].map(row => row.join(',')).join('\n');

              const blob = new Blob([csvData], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `climate-logs-${dayjs().format('YYYY-MM-DD')}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            className="export-btn"
          >
            📥 Download CSV
          </button>
        </div>
      )}
    </div>
  );
}
