import React from 'react';
import './VoiceDemo.css';

export default function VoiceDemo() {
  return (
    <div className="voice-demo">
      <div className="demo-header">
        <h2>🎤 Voice Control Demo</h2>
        <p>See how easy it is to add voice recognition to your smart classroom!</p>
      </div>

      <div className="demo-features">
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Easy Integration</h3>
          <p>Just 3 lines of code to add voice control to any component</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Smart Commands</h3>
          <p>Natural language processing for intuitive control</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔧</div>
          <h3>No External APIs</h3>
          <p>Uses browser's built-in Web Speech API - no Google Assistant needed</p>
        </div>
      </div>

      <div className="demo-code">
        <h3>Implementation Example:</h3>
        <pre>{`// 1. Add voice control component
<VoiceControl
  onLightingControl={handleVoiceCommand}
  isListening={isListening}
  onToggleListening={setIsListening}
  currentModule="lighting"
/>

// 2. Handle voice commands
const handleVoiceCommand = (command) => {
  switch(command) {
    case 'turn on light': setLightOn(true); break;
    case 'brighten': setBrightness(prev => prev + 50); break;
    case 'dim': setBrightness(prev => prev - 50); break;
  }
};`}</pre>
      </div>

      <div className="demo-commands">
        <h3>Supported Voice Commands:</h3>
        <div className="command-grid">
          <div className="command-category">
            <h4>Lighting Control</h4>
            <ul>
              <li>"Turn on light" / "Light on"</li>
              <li>"Turn off light" / "Light off"</li>
              <li>"Make it brighter" / "Brighter"</li>
              <li>"Dim the light" / "Dimmer"</li>
              <li>"Maximum brightness" / "Full power"</li>
              <li>"Switch to auto mode"</li>
            </ul>
          </div>
          
          <div className="command-category">
            <h4>Climate Control</h4>
            <ul>
              <li>"Turn on fan" / "Fan on"</li>
              <li>"Turn off fan" / "Fan off"</li>
              <li>"Fan high speed" / "Maximum fan"</li>
              <li>"Fan low speed" / "Minimum fan"</li>
              <li>"Boost mode" / "Turbo"</li>
              <li>"Switch to manual mode"</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="demo-benefits">
        <h3>Why Voice Control is Perfect for Your Project:</h3>
        <div className="benefits-list">
          <div className="benefit-item">
            <span className="benefit-icon">✅</span>
            <span>Enhances accessibility for students with disabilities</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✅</span>
            <span>Hands-free operation during presentations</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✅</span>
            <span>Modern, futuristic classroom experience</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✅</span>
            <span>Easy to demonstrate in your assignment</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✅</span>
            <span>Works with existing Firebase integration</span>
          </div>
        </div>
      </div>
    </div>
  );
}
