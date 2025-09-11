import { useState } from 'react';
import './Dashboard.css'; // Reuse the same styles

export default function ClimateControl() {
  const [activeTab, setActiveTab] = useState<'live' | 'reports'>('live');

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🌡️ Smart Classroom Climate Control</h1>
        <div className="connection-status">
          <div className="status-indicator disconnected"></div>
          <span>Coming Soon</span>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={activeTab === 'live' ? 'active' : ''}
          onClick={() => setActiveTab('live')}
        >
          Live Control
        </button>
        <button 
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          Reports & Analytics
        </button>
      </nav>

      {activeTab === 'live' && (
        <div className="live-control">
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '8px',
            margin: '2rem 0'
          }}>
            <h3>🚧 Climate Control - Coming Soon</h3>
            <p>This module will control temperature, humidity, and fan speed.</p>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '8px',
          margin: '2rem 0'
        }}>
          <h3>📊 Climate Analytics - Coming Soon</h3>
          <p>This section will show temperature trends, humidity charts, and fan usage analytics.</p>
        </div>
      )}
    </div>
  );
}
