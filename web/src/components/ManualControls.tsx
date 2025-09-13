import React, { useState } from 'react';
import './ManualControls.css';

interface ManualControlsProps {
  led: { on: boolean; pwm: number };
  onControlChange: (led: { on: boolean; pwm: number }) => void;
}

export default function ManualControls({ led, onControlChange }: ManualControlsProps) {
  const [localPwm, setLocalPwm] = useState(led.pwm);

  // Update local state when prop changes (from Firebase)
  React.useEffect(() => {
    setLocalPwm(led.pwm);
  }, [led.pwm]);

  const handleToggle = () => {
    const newState = { 
      on: !led.on, 
      pwm: led.on ? 0 : (localPwm > 0 ? localPwm : 128) // Default to mid-brightness if 0
    };
    onControlChange(newState);
  };

  const handlePwmChange = (value: number) => {
    setLocalPwm(value);
    // Auto-turn on LED if PWM > 0, turn off if PWM = 0
    const shouldBeOn = value > 0;
    onControlChange({ on: shouldBeOn, pwm: value });
  };

  return (
    <div className="manual-controls">
      <h3 style={{ color: '#000000' }}>🎛️ Manual Lighting Controls</h3>
      
      <div className="control-group">
        <label>Light Control</label>
        <button 
          className={`toggle-btn ${led.on ? 'on' : 'off'}`}
          onClick={handleToggle}
        >
          {led.on ? '💡 ON' : '⚫ OFF'}
        </button>
      </div>

      <div className="control-group">
        <label>Brightness: {led.on ? led.pwm : localPwm} / 255</label>
        <input
          type="range"
          min="0"
          max="255"
          value={led.on ? led.pwm : localPwm}
          onChange={(e) => handlePwmChange(parseInt(e.target.value))}
          className="brightness-slider"
        />
        <div className="brightness-labels">
          <span>Dim</span>
          <span>Bright</span>
        </div>
      </div>

      <div className="control-info">
        <p>💡 <strong>Current State:</strong> {led.on ? `ON at ${led.pwm}/255` : 'OFF'}</p>
        <p>⚡ <strong>Power Usage:</strong> ~{Math.round((led.pwm / 255) * 10)}W</p>
      </div>
    </div>
  );
}