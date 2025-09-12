import type { ClimateState } from '../types';
import './StatusTiles.css';

interface ClimateStatusTilesProps {
  state: ClimateState;
}

export default function ClimateStatusTiles({ state }: ClimateStatusTilesProps) {
  const getTemperatureStatus = (tempC: number) => {
    if (tempC < 25) return { label: 'Cool', status: 'success' as const };
    if (tempC > 29) return { label: 'Hot', status: 'warning' as const };
    return { label: 'Comfortable', status: 'success' as const };
  };

  const getAirQualityStatus = (aqStatus: string) => {
    switch (aqStatus) {
      case 'Good': return { status: 'success' as const };
      case 'Moderate': return { status: 'warning' as const };
      case 'Poor': return { status: 'error' as const };
      default: return { status: 'success' as const };
    }
  };

  const getHumidityStatus = (humidity: number) => {
    if (humidity < 30) return { label: 'Dry', status: 'warning' as const };
    if (humidity > 70) return { label: 'Humid', status: 'warning' as const };
    return { label: 'Optimal', status: 'success' as const };
  };

  const tempStatus = getTemperatureStatus(state.tempC);
  const aqStatus = getAirQualityStatus(state.aqStatus);
  const humidityStatus = getHumidityStatus(state.humidity);

  return (
    <div className="status-tiles">
      <div className="tile">
        <div className="tile-icon">👤</div>
        <div className="tile-content">
          <h3>Presence</h3>
          <div className={`tile-value ${state.presence ? 'active' : ''}`}>
            {state.presence ? 'DETECTED' : 'None'}
          </div>
        </div>
      </div>

      <div className="tile">
        <div className="tile-icon">🌡️</div>
        <div className="tile-content">
          <h3>Temperature</h3>
          <div className={`tile-value ${tempStatus.status}`}>
            {state.tempC.toFixed(1)}°C
          </div>
          <div className="tile-subtitle">{tempStatus.label}</div>
        </div>
      </div>

      <div className="tile">
        <div className="tile-icon">🌫️</div>
        <div className="tile-content">
          <h3>Air Quality</h3>
          <div className={`tile-value ${aqStatus.status}`}>
            {state.aqStatus}
          </div>
          <div className="tile-subtitle">Raw: {state.aqRaw}</div>
        </div>
      </div>

      <div className="tile">
        <div className="tile-icon">🌪️</div>
        <div className="tile-content">
          <h3>Fan Status</h3>
          <div className={`tile-value ${state.fan.on ? 'active' : ''}`}>
            {state.fan.on ? 'ON' : 'OFF'}
          </div>
          <div className="tile-subtitle">PWM: {state.fan.pwm}</div>
        </div>
      </div>

      <div className="tile">
        <div className="tile-icon">⚙️</div>
        <div className="tile-content">
          <h3>Mode</h3>
          <div className="tile-value">
            {state.mode.toUpperCase()}
          </div>
          {state.sensorError && (
            <div className="tile-error">⚠️ {state.sensorError} Error</div>
          )}
        </div>
      </div>

      <div className="tile">
        <div className="tile-icon">💧</div>
        <div className="tile-content">
          <h3>Humidity</h3>
          <div className={`tile-value ${humidityStatus.status}`}>
            {state.humidity.toFixed(1)}%
          </div>
          <div className="tile-subtitle">{humidityStatus.label}</div>
        </div>
      </div>

      <div className="tile">
        <div className="tile-icon">🎯</div>
        <div className="tile-content">
          <h3>Comfort Band</h3>
          <div className="tile-value">
            {state.comfortBand}
          </div>
        </div>
      </div>

      <div className="tile timestamp">
        <div className="tile-icon">🕐</div>
        <div className="tile-content">
          <h3>Last Update</h3>
          <div className="tile-value">
            {new Date(state.ts).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
