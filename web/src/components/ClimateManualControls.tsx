import React, { useState } from 'react';
import './ManualControls.css';

interface ClimateManualControlsProps {
  fan: { on: boolean; pwm: number };
  onControlChange: (fan: { on: boolean; pwm: number }) => void;
  airQualityStatus?: string;
  airQualityAlert?: string;
}

export default function ClimateManualControls({ fan, onControlChange, airQualityStatus, airQualityAlert }: ClimateManualControlsProps) {
  const [localPwm, setLocalPwm] = useState(fan.pwm);

  // Update local state when prop changes (from Firebase)
  React.useEffect(() => {
    setLocalPwm(fan.pwm);
  }, [fan.pwm]);

  const isAirQualityOverride = airQualityStatus === "Poor";

  const handleToggle = () => {
    const newState = { 
      on: !fan.on, 
      pwm: fan.on ? 0 : (localPwm > 0 ? localPwm : 128) // Default to mid-speed if 0
    };
    onControlChange(newState);
  };

  const handlePwmChange = (value: number) => {
    setLocalPwm(value);
    // Auto-turn on fan if PWM > 0, turn off if PWM = 0
    const shouldBeOn = value > 0;
    onControlChange({ on: shouldBeOn, pwm: value });
  };

  const getFanSpeedLabel = (pwm: number) => {
    if (pwm === 0) return 'OFF';
    if (pwm <= 85) return 'LOW';
    if (pwm <= 170) return 'MEDIUM';
    return 'HIGH';
  };

  const getPowerUsage = (pwm: number) => {
    // Fan power calculation (assuming 5V DC fan, ~500mA max)
    return Math.round((pwm / 255) * 2.5 * 100) / 100; // Max ~2.5W
  };

  return (
    <div className="manual-controls">
      <h3 style={{ color: '#000000' }}>🎛️ Manual Fan Controls</h3>
      
      {/* Air Quality Alert */}
      {isAirQualityOverride && (
        <div className="air-quality-alert" style={{
          backgroundColor: '#ff8800',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          marginBottom: '15px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          ⚠️ AIR QUALITY ALERT: POOR AIR QUALITY DETECTED
          <br />
          <small>Auto mode will force fan to maximum speed, but manual control is still available</small>
          {airQualityAlert && <div style={{ marginTop: '5px', fontSize: '0.9em' }}>{airQualityAlert}</div>}
        </div>
      )}
      
      <div className="control-group">
        <label>Fan Control</label>
        <button 
          className={`toggle-btn ${fan.on ? 'on' : 'off'}`}
          onClick={handleToggle}
        >
          {fan.on ? '🌪️ ON' : '⚫ OFF'}
        </button>
      </div>

      <div className="control-group">
        <label>Fan Speed: {getFanSpeedLabel(fan.on ? fan.pwm : localPwm)} ({fan.on ? fan.pwm : localPwm} / 255)</label>
        <input
          type="range"
          min="0"
          max="255"
          value={fan.on ? fan.pwm : localPwm}
          onChange={(e) => handlePwmChange(parseInt(e.target.value))}
          className="brightness-slider"
        />
        <div className="brightness-labels">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      <div className="control-info">
        <p>🌪️ <strong>Current State:</strong> {fan.on ? `${getFanSpeedLabel(fan.pwm)} at ${fan.pwm}/255` : 'OFF'}</p>
        <p>⚡ <strong>Power Usage:</strong> ~{getPowerUsage(fan.on ? fan.pwm : 0)}W</p>
        {isAirQualityOverride ? (
          <p>⚠️ <strong>Air Quality Alert:</strong> Poor air quality detected - Auto mode will force maximum fan speed</p>
        ) : (
          <p>🌡️ <strong>Note:</strong> Fan speed automatically adjusts based on temperature and air quality in Auto mode</p>
        )}
      </div>
    </div>
  );
}
