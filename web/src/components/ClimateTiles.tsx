import { useState, useEffect } from 'react';
import type { ClimateState } from '../types';
import { AQ_GOOD_THRESHOLD, AQ_MODERATE_THRESHOLD } from '../types';
import './ClimateTiles.css';

interface ClimateTilesProps {
  state: ClimateState;
  onModeChange: (mode: 'auto' | 'manual') => void;
  onFanToggle: () => void;
  onPwmChange: (pwm: number) => void;
  onBoostToggle: () => void;
}

export default function ClimateTiles({ 
  state, 
  onModeChange, 
  onFanToggle, 
  onPwmChange, 
  onBoostToggle 
}: ClimateTilesProps) {
  const [localPwm, setLocalPwm] = useState(state.fan.pwm);

  useEffect(() => {
    setLocalPwm(state.fan.pwm);
  }, [state.fan.pwm]);

  const getAqStatusInfo = (aqRaw: number) => {
    if (aqRaw < AQ_GOOD_THRESHOLD) return { label: 'Good', status: 'success' as const };
    if (aqRaw < AQ_MODERATE_THRESHOLD) return { label: 'Moderate', status: 'warning' as const };
    return { label: 'Poor', status: 'error' as const };
  };

  const getTempStatus = (temp: number) => {
    if (temp < 25) return 'success';
    if (temp < 29) return 'warning';
    return 'error';
  };

  const getFanSpeedLabel = (pwm: number) => {
    if (pwm === 0) return 'OFF';
    if (pwm < 100) return 'LOW';
    if (pwm < 180) return 'MEDIUM';
    return 'HIGH';
  };

  const handlePwmChange = (value: number) => {
    setLocalPwm(value);
    onPwmChange(value);
  };

  const aqStatusInfo = getAqStatusInfo(state.aqRaw);
  const boostTimeRemaining = state.boostMode && state.boostEndTime 
    ? Math.max(0, Math.ceil((state.boostEndTime - Date.now()) / 1000 / 60))
    : 0;

  return (
    <div className="climate-container">
      <div className="climate-header">
        <h2>🌡️ Climate Control</h2>
      </div>

      <div className="climate-tiles">
        <div className="tile">
          <div className="tile-icon">🌡️</div>
          <div className="tile-content">
            <h3>Temperature</h3>
            <div className={`tile-value ${getTempStatus(state.temperature)}`}>
              {state.temperature.toFixed(1)}°C
            </div>
          </div>
        </div>

        <div className="tile">
          <div className="tile-icon">🌬️</div>
          <div className="tile-content">
            <h3>Air Quality</h3>
            <div className={`tile-value ${aqStatusInfo.status}`}>
              {state.aqRaw}
            </div>
            <div className="tile-subtitle">{aqStatusInfo.label}</div>
          </div>
        </div>

        <div className="tile">
          <div className="tile-icon">💨</div>
          <div className="tile-content">
            <h3>Fan Status</h3>
            <div className={`tile-value ${state.fan.on ? 'active' : ''}`}>
              {state.fan.on ? getFanSpeedLabel(state.fan.pwm) : 'OFF'}
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
            {state.boostMode && (
              <div className="tile-boost">🚀 Boost: {boostTimeRemaining}m</div>
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

      <div className="climate-controls">
        <div className="control-section">
          <h3>Control Mode</h3>
          <div className="mode-switch">
            <button 
              className={state.mode === 'auto' ? 'active' : ''}
              onClick={() => onModeChange('auto')}
            >
              🤖 Automatic
            </button>
            <button 
              className={state.mode === 'manual' ? 'active' : ''}
              onClick={() => onModeChange('manual')}
            >
              🎛️ Manual
            </button>
          </div>
        </div>

        {state.mode === 'manual' && (
          <div className="control-section">
            <h3>Manual Controls</h3>
            <div className="manual-controls">
              <div className="control-item">
                <label className="control-label">
                  <span>Fan Power</span>
                  <button 
                    className={`toggle-button ${state.fan.on ? 'active' : ''}`}
                    onClick={onFanToggle}
                  >
                    {state.fan.on ? 'ON' : 'OFF'}
                  </button>
                </label>
              </div>

              <div className="control-item">
                <label className="control-label">
                  <span>PWM Speed: {localPwm}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={localPwm}
                  onChange={(e) => handlePwmChange(Number(e.target.value))}
                  className="pwm-slider"
                  disabled={!state.fan.on}
                />
                <div className="slider-labels">
                  <span>0</span>
                  <span>127</span>
                  <span>255</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="control-section">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <button 
              className={`boost-button ${state.boostMode ? 'active' : ''}`}
              onClick={onBoostToggle}
            >
              {state.boostMode ? `🚀 Boost Active (${boostTimeRemaining}m)` : '🚀 Boost 10 min'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
