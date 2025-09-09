import Climate from './Climate';

export default function ClimateModule() {
  return (
    <div className="module-container">
      <header className="module-header">
        <h1>🌡️ Smart Climate Control</h1>
        <div className="connection-status">
          <div className="status-indicator disconnected"></div>
          <span>Demo Mode</span>
        </div>
      </header>

      <div className="error-banner">
        ⚠️ Demo mode - Using simulated climate data
      </div>

      <div className="module-content">
        <div className="live-control">
          <Climate />
        </div>
      </div>
    </div>
  );
}
