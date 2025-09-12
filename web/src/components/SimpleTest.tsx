import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db as database } from '../firebase';

export default function SimpleTest() {
  const [result, setResult] = useState<string>('Testing...');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🔍 Testing Firebase connection...');
        
        // Test basic connection
        const testRef = ref(database, '/');
        const snapshot = await get(testRef);
        
        if (snapshot.exists()) {
          setResult('✅ Firebase connected successfully!');
          setData(snapshot.val());
          console.log('✅ Firebase data:', snapshot.val());
        } else {
          setResult('⚠️ Firebase connected but no data found');
        }
        
      } catch (error) {
        console.error('❌ Firebase error:', error);
        setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div style={{ 
      padding: '2rem', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white', 
      borderRadius: '8px',
      margin: '1rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>🧪 Simple Firebase Test</h2>
      <div style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>
        <strong>Status:</strong> {result}
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <strong>Database URL:</strong> {database.app.options.databaseURL}
      </div>
      
      {data && (
        <div>
          <strong>Root Data:</strong>
          <pre style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '1rem', 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '200px',
            fontSize: '0.9rem'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
        💡 Check browser console (F12) for detailed logs
      </div>
    </div>
  );
}
