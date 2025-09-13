// Test script to check if combined logs are being created
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvQvQvQvQvQvQvQvQvQvQvQvQvQvQvQvQ",
  authDomain: "smartclassroom-af237.firebaseapp.com",
  databaseURL: "https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartclassroom-af237",
  storageBucket: "smartclassroom-af237.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function testCombinedLogs() {
  console.log('🔍 Testing combined logs data...');
  
  try {
    // Test combined logs path
    const combinedLogsRef = ref(database, '/combined/roomA/logs');
    const snapshot = await get(combinedLogsRef);
    
    console.log('📊 Combined logs exists:', snapshot.exists());
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('📊 Combined logs data type:', typeof data);
      console.log('📊 Combined logs keys count:', Object.keys(data || {}).length);
      
      if (data && Object.keys(data).length > 0) {
        const firstKey = Object.keys(data)[0];
        const firstLog = data[firstKey];
        console.log('📊 First log structure:', JSON.stringify(firstLog, null, 2));
        
        // Check if it has the expected structure
        if (firstLog.lighting && firstLog.climate && firstLog.ai) {
          console.log('✅ Combined logs have correct structure!');
          console.log('├─ Lighting data:', firstLog.lighting);
          console.log('├─ Climate data:', firstLog.climate);
          console.log('└─ AI data:', firstLog.ai);
        } else {
          console.log('❌ Combined logs missing expected structure');
        }
      } else {
        console.log('📊 Combined logs is empty');
      }
    } else {
      console.log('❌ No combined logs found - ESP32 may not be logging to this path');
    }
    
  } catch (error) {
    console.error('❌ Error testing combined logs:', error);
  }
}

testCombinedLogs();
