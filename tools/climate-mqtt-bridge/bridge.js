#!/usr/bin/env node

const mqtt = require('mqtt');
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.bridge' });

// Configuration validation
const requiredEnvVars = [
  'MQTT_URL',
  'MQTT_TOPIC_BASE',
  'FIREBASE_DB_URL',
  'ROOM_IDS'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please create .env.bridge file with required configuration.');
  process.exit(1);
}

// Initialize Firebase Admin
let serviceAccount;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  } else {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS path not specified');
  }
} catch (error) {
  console.error('Failed to load Firebase service account:', error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();
const debug = process.env.DEBUG === 'true';

// Parse room IDs
const roomIds = process.env.ROOM_IDS.split(',').map(id => id.trim());

// MQTT client configuration
const mqttOptions = {
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
  reconnectPeriod: 5000,
  connectTimeout: 30000
};

console.log(`Starting Climate MQTT Bridge for rooms: ${roomIds.join(', ')}`);
console.log(`MQTT URL: ${process.env.MQTT_URL}`);
console.log(`Topic base: ${process.env.MQTT_TOPIC_BASE}`);

// Connect to MQTT broker
const client = mqtt.connect(process.env.MQTT_URL, mqttOptions);

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  
  // Subscribe to telemetry and log topics for all rooms
  roomIds.forEach(roomId => {
    const telemetryTopic = `${process.env.MQTT_TOPIC_BASE}/climate/${roomId}/telemetry`;
    const logTopic = `${process.env.MQTT_TOPIC_BASE}/climate/${roomId}/log`;
    
    client.subscribe(telemetryTopic, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${telemetryTopic}:`, err);
      } else {
        console.log(`📡 Subscribed to ${telemetryTopic}`);
      }
    });
    
    client.subscribe(logTopic, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${logTopic}:`, err);
      } else {
        console.log(`📡 Subscribed to ${logTopic}`);
      }
    });
  });
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const topicParts = topic.split('/');
    
    if (topicParts.length < 4) {
      console.warn(`⚠️  Invalid topic format: ${topic}`);
      return;
    }
    
    const roomId = topicParts[2];
    const messageType = topicParts[3]; // 'telemetry' or 'log'
    
    if (debug) {
      console.log(`📨 Received ${messageType} for ${roomId}:`, payload);
    }
    
    // Validate payload
    const validatedPayload = validateClimatePayload(payload);
    if (!validatedPayload) {
      console.warn(`⚠️  Invalid payload for ${topic}, skipping`);
      return;
    }
    
    if (messageType === 'telemetry') {
      // Update current state
      await updateClimateState(roomId, validatedPayload);
      
      // Also append to logs
      await appendClimateLog(roomId, validatedPayload);
      
    } else if (messageType === 'log') {
      // Append to logs only
      await appendClimateLog(roomId, validatedPayload);
    }
    
  } catch (error) {
    console.error(`❌ Error processing message from ${topic}:`, error);
  }
});

client.on('error', (error) => {
  console.error('❌ MQTT connection error:', error);
});

client.on('close', () => {
  console.log('🔌 MQTT connection closed');
});

client.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT broker...');
});

// Firebase command watchers
roomIds.forEach(roomId => {
  const cmdRef = db.ref(`climate/${roomId}/cmd`);
  
  cmdRef.on('value', async (snapshot) => {
    const command = snapshot.val();
    if (!command) return;
    
    try {
      // Publish command to MQTT
      const cmdTopic = `${process.env.MQTT_TOPIC_BASE}/climate/${roomId}/cmd`;
      const cmdPayload = JSON.stringify(command);
      
      client.publish(cmdTopic, cmdPayload, (err) => {
        if (err) {
          console.error(`❌ Failed to publish command to ${cmdTopic}:`, err);
        } else if (debug) {
          console.log(`📤 Published command to ${cmdTopic}:`, command);
        }
      });
      
    } catch (error) {
      console.error(`❌ Error processing command for ${roomId}:`, error);
    }
  });
  
  console.log(`👀 Watching Firebase commands for ${roomId}`);
});

// Helper functions
function validateClimatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  
  const validated = {};
  
  // Add timestamp if not present
  if (!payload.updatedAt && !payload.timestamp) {
    validated.updatedAt = Date.now();
  } else {
    validated.updatedAt = payload.updatedAt || payload.timestamp;
  }
  
  // Validate temperature
  if (payload.tempC !== undefined) {
    const temp = parseFloat(payload.tempC);
    if (!isNaN(temp) && temp >= -50 && temp <= 100) {
      validated.tempC = temp;
    }
  }
  
  // Validate humidity
  if (payload.humidity !== undefined) {
    const humidity = parseFloat(payload.humidity);
    if (!isNaN(humidity) && humidity >= 0 && humidity <= 100) {
      validated.humidity = humidity;
    }
  }
  
  // Validate air quality
  if (payload.aqRaw !== undefined) {
    const aq = parseInt(payload.aqRaw);
    if (!isNaN(aq) && aq >= 0 && aq <= 4095) {
      validated.aqRaw = aq;
    }
  }
  
  // Validate mode
  if (payload.mode && ['Auto', 'Manual'].includes(payload.mode)) {
    validated.mode = payload.mode;
  }
  
  // Validate fan state
  if (payload.fan && typeof payload.fan === 'object') {
    validated.fan = {};
    
    if (typeof payload.fan.on === 'boolean') {
      validated.fan.on = payload.fan.on;
    }
    
    if (payload.fan.pwm !== undefined) {
      const pwm = parseInt(payload.fan.pwm);
      if (!isNaN(pwm) && pwm >= 0 && pwm <= 255) {
        validated.fan.pwm = pwm;
      }
    }
  }
  
  // Validate presence
  if (typeof payload.presence === 'boolean') {
    validated.presence = payload.presence;
  }
  
  // Derive AQ status if not provided
  if (validated.aqRaw !== undefined && !payload.aqStatus) {
    if (validated.aqRaw < 200) validated.aqStatus = 'Good';
    else if (validated.aqRaw < 400) validated.aqStatus = 'Moderate';
    else validated.aqStatus = 'Poor';
  } else if (payload.aqStatus && ['Good', 'Moderate', 'Poor', 'Unknown'].includes(payload.aqStatus)) {
    validated.aqStatus = payload.aqStatus;
  }
  
  return validated;
}

async function updateClimateState(roomId, data) {
  try {
    const stateRef = db.ref(`climate/${roomId}/state`);
    await stateRef.update(data);
    
    if (debug) {
      console.log(`✅ Updated state for ${roomId}`);
    }
  } catch (error) {
    console.error(`❌ Failed to update state for ${roomId}:`, error);
  }
}

async function appendClimateLog(roomId, data) {
  try {
    const logsRef = db.ref(`climate/${roomId}/logs`);
    const logEntry = {
      ...data,
      timestamp: data.updatedAt || Date.now()
    };
    
    await logsRef.push(logEntry);
    
    if (debug) {
      console.log(`✅ Appended log for ${roomId}`);
    }
  } catch (error) {
    console.error(`❌ Failed to append log for ${roomId}:`, error);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bridge...');
  client.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bridge...');
  client.end();
  process.exit(0);
});

console.log('🚀 Climate MQTT Bridge started successfully');
