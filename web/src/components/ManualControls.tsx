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
    const newState = { on: !led.on, pwm: led.on ? 0 : localPwm };
    onControlChange(newState);
  };

  const handlePwmChange = (value: number) => {
    setLocalPwm(value);
    // Always send the change, regardless of LED state
    onControlChange({ on: led.on, pwm: value });
  };

  return (
    <div className="manual-controls">
      <h3>🎛️ Manual Controls</h3>
      
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