import { useState, useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db as database } from '../firebase';
import { ROOM_ID } from '../types';

export default function FirebaseTest() {
  const [status, setStatus] = useState('Testing...');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const testFirebase = async () => {
      try {
        console.log('🔍 Testing Firebase connection...');
        console.log('📍 Database URL:', database.app.options.databaseURL);
        console.log('📍 Target path:', `/lighting/${ROOM_ID}/state`);
        
        // Test 1: Check if we can read the root
        const rootRef = ref(database, '/');
        const rootSnapshot = await get(rootRef);
        console.log('✅ Root access successful:', rootSnapshot.exists());
        
        // Test 2: Check lighting path
        const lightingRef = ref(database, '/lighting');
        const lightingSnapshot = await get(lightingRef);
        console.log('✅ Lighting path exists:', lightingSnapshot.exists());
        console.log('📊 Lighting data:', lightingSnapshot.val());
        
        // Test 3: Check roomA state
        const stateRef = ref(database, `/lighting/${ROOM_ID}/state`);
        const stateSnapshot = await get(stateRef);
        console.log('✅ Room state exists:', stateSnapshot.exists());
        console.log('📊 Room state data:', stateSnapshot.val());
        
        if (stateSnapshot.exists()) {
          setData(stateSnapshot.val());
          setStatus('✅ Firebase connected and data found!');
        } else {
          setStatus('⚠️ Firebase connected but no data at /lighting/roomA/state');
        }
        
        // Test 4: Listen for real-time updates
        const unsubscribe = onValue(stateRef, (snapshot) => {
          console.log('🔄 Real-time update received:', snapshot.val());
          setData(snapshot.val());
        });
        
        return () => unsubscribe();
        
      } catch (err) {
        console.error('❌ Firebase test failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('❌ Firebase connection failed');
      }
    };

    testFirebase();
  }, []);

  return (
    <div style={{ 
      padding: '2rem', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      borderRadius: '8px',
      margin: '1rem',
      fontFamily: 'monospace'
    }}>
      <h2>🔍 Firebase Connection Test</h2>
      <div style={{ marginBottom: '1rem' }}>
        <strong>Status:</strong> {status}
      </div>
      
      {error && (
        <div style={{ color: '#ff6b6b', marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div style={{ marginBottom: '1rem' }}>
        <strong>Database URL:</strong> {database.app.options.databaseURL}
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <strong>Target Path:</strong> /lighting/{ROOM_ID}/state
      </div>
      
      {data && (
        <div>
          <strong>Current Data:</strong>
          <pre style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '1rem', 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#ccc' }}>
        💡 Check browser console (F12) for detailed logs
      </div>
    </div>
  );
}
