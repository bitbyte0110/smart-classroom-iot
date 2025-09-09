import type { LightingState } from '../types';
import { BRIGHT_THRESHOLD, DARK_THRESHOLD } from '../types';
import './StatusTiles.css';

interface StatusTilesProps {
  state: LightingState;
}

export default function StatusTiles({ state }: StatusTilesProps) {
  const getBrightnessStatus = (ldrRaw: number) => {
    if (ldrRaw < BRIGHT_THRESHOLD) return { label: 'Bright', status: 'success' as const };
    if (ldrRaw > DARK_THRESHOLD) return { label: 'Dark', status: 'warning' as const };
    return { label: 'Moderate', status: 'success' as const };
  };

  const brightnessStatus = getBrightnessStatus(state.ldrRaw);
  const brightnessPercent = Math.round((state.ldrRaw / 4095) * 100);

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
        <div className="tile-icon">☀️</div>
        <div className="tile-content">
          <h3>Brightness</h3>
          <div className={`tile-value ${brightnessStatus.status}`}>
            {brightnessPercent}%
          </div>
          <div className="tile-subtitle">{brightnessStatus.label}</div>
        </div>
      </div>

      <div className="tile">
        <div className="tile-icon">💡</div>
        <div className="tile-content">
          <h3>LED Status</h3>
          <div className={`tile-value ${state.led.on ? 'active' : ''}`}>
            {state.led.on ? 'ON' : 'OFF'}
          </div>
          <div className="tile-subtitle">PWM: {state.led.pwm}</div>
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