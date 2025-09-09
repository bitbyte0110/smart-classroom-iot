// Simple test page to verify React is working
export default function TestPage() {
  return (
    <div style={{
      padding: '2rem',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🏫 Smart Lighting System - Test Page</h1>
      <p>✅ React is working!</p>
      <p>✅ TypeScript is working!</p>
      <p>✅ CSS is working!</p>
      
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '1rem',
        borderRadius: '10px',
        marginTop: '2rem'
      }}>
        <h3>Next Steps:</h3>
        <ol>
          <li>Start Firebase emulator: <code>firebase emulators:start</code></li>
          <li>This test page should load properly</li>
          <li>Then we can test the full dashboard</li>
        </ol>
      </div>
      
      <button 
        onClick={() => alert('Button works!')}
        style={{
          background: '#00d2ff',
          border: 'none',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          marginTop: '1rem',
          cursor: 'pointer'
        }}
      >
        Test Button
      </button>
    </div>
  );
}