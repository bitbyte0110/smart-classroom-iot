# Climate MQTT Bridge Service

This Node.js service bridges MQTT telemetry from ESP32 climate devices to Firebase Realtime Database, enabling the web dashboard to display live data and send commands back to the hardware.

## Architecture

```
ESP32 Climate Device ↔ MQTT Broker ↔ Bridge Service ↔ Firebase ↔ Web Dashboard
```

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed
- Firebase project with Realtime Database enabled
- MQTT broker running (Raspberry Pi or cloud service)
- ESP32 climate device publishing to MQTT

### 2. Installation
```bash
cd tools/climate-mqtt-bridge
npm install
```

### 3. Configuration

#### Firebase Service Account
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" and download the JSON file
3. Save it as `serviceAccountKey.json` in this directory

#### Environment Variables
1. Copy `.env.bridge.example` to `.env.bridge`
2. Edit `.env.bridge` with your configuration:

```bash
# MQTT Configuration
MQTT_URL=tcp://192.168.0.102:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC_BASE=campus

# Firebase Admin Configuration
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
FIREBASE_DB_URL=https://smartclassroom-af237-default-rtdb.firebaseio.com

# Application Configuration
ROOM_IDS=roomA,roomB
DEBUG=true
```

### 4. MQTT Topic Structure

The bridge expects and publishes to these topics:

#### From ESP32 to Firebase (Telemetry)
- `{base}/climate/{roomId}/telemetry` - Live sensor data
- `{base}/climate/{roomId}/log` - Historical log entries

Example payload:
```json
{
  "tempC": 26.5,
  "humidity": 45.2,
  "aqRaw": 245,
  "mode": "Auto",
  "fan": {
    "on": true,
    "pwm": 160
  },
  "presence": true,
  "updatedAt": 1703123456789
}
```

#### From Firebase to ESP32 (Commands)
- `{base}/climate/{roomId}/cmd` - Control commands

Example payload:
```json
{
  "mode": "Manual",
  "fan": {
    "on": true,
    "pwm": 200
  },
  "boost": {
    "enabled": true,
    "minutes": 10
  },
  "issuedAt": 1703123456789
}
```

### 5. Firebase Database Structure

The bridge maintains this structure in Firebase:

```
/climate/
  ├── roomA/
  │   ├── state/          # Current live state
  │   ├── cmd/            # Commands from web UI
  │   └── logs/           # Historical data
  │       ├── -ABC123/    # Auto-generated keys
  │       └── -XYZ789/
  └── roomB/
      └── ...
```

### 6. Running the Bridge

#### Development
```bash
npm run dev
```

#### Production
```bash
npm start
```

#### As a System Service (Linux)
Create `/etc/systemd/system/climate-bridge.service`:
```ini
[Unit]
Description=Climate MQTT Bridge
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/smart-classroom/tools/climate-mqtt-bridge
ExecStart=/usr/bin/node bridge.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable climate-bridge
sudo systemctl start climate-bridge
sudo systemctl status climate-bridge
```

## Troubleshooting

### Bridge Not Connecting to MQTT
- Check MQTT broker is running: `mosquitto_sub -h 192.168.0.102 -t 'test'`
- Verify MQTT_URL in `.env.bridge`
- Check firewall/network connectivity

### Firebase Connection Issues
- Verify `serviceAccountKey.json` is valid and in the correct location
- Check `FIREBASE_DB_URL` matches your project
- Ensure Realtime Database is enabled (not just Firestore)

### ESP32 Not Receiving Commands
- Check ESP32 is subscribed to command topic
- Verify topic format matches: `{base}/climate/{roomId}/cmd`
- Monitor MQTT broker logs

### Data Not Appearing in Web Dashboard
- Check bridge logs for Firebase write errors
- Verify data validation in bridge (invalid ranges are filtered)
- Ensure web app has correct Firebase client configuration

## Monitoring

### Bridge Logs
The bridge logs all operations to console:
- ✅ Successful operations
- ❌ Errors and failures
- 📡 MQTT subscriptions
- 📨 Received messages (when DEBUG=true)
- 📤 Published commands

### Health Checks
Monitor these indicators:
- Bridge process is running
- MQTT connection status
- Firebase connection status
- Recent telemetry timestamps
- Command acknowledgments from ESP32

## Security Notes

- Keep `serviceAccountKey.json` secure and never commit to version control
- Use Firebase security rules to restrict database access
- Consider MQTT authentication for production deployments
- Rotate Firebase service account keys regularly

## Data Validation

The bridge validates and filters telemetry data:
- Temperature: -50°C to 100°C
- Humidity: 0% to 100%
- Air Quality: 0 to 4095 (12-bit ADC)
- Fan PWM: 0 to 255
- Invalid/NaN values are rejected

## Performance

- Bridge handles multiple rooms simultaneously
- Automatic reconnection to MQTT and Firebase
- Minimal memory usage (~50MB typical)
- Processes 100+ messages/second easily
