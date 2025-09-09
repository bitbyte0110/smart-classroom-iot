# Climate/Fan Module

## Overview

This module adds climate control functionality to the smart classroom dashboard, including temperature monitoring, air quality tracking, and fan control with both automatic and manual modes.

## Features

### Live Data Display
- **Temperature**: Real-time temperature in Celsius (23-32°C range)
- **Air Quality**: Raw values (100-500) with status indicators:
  - Good (< 200) - Green
  - Moderate (200-350) - Orange  
  - Poor (> 350) - Red
- **Fan Status**: Current state (ON/OFF) and PWM value (0-255)
- **Mode**: Auto or Manual operation mode
- **Boost Mode**: 10-minute high-speed operation

### Control Features
- **Auto/Manual Mode Toggle**: Switch between automatic temperature-based control and manual operation
- **Manual Controls**: 
  - Fan ON/OFF switch
  - PWM slider (0-255) for speed control
  - Disabled when fan is off
- **Boost Mode**: Instantly set fan to maximum speed for 10 minutes
- **Real-time Updates**: Sensor data updates every 5 seconds

### Auto Mode Rules
- Temperature < 25°C → Fan LOW (PWM ~90)
- Temperature 25-29°C → Fan MEDIUM (PWM ~160)  
- Temperature > 29°C → Fan HIGH (PWM ~230)

## Current Implementation

### Mock Data Simulation
The module currently uses simulated data instead of real Firebase/hardware:
- Generates random temperature values between 23-32°C
- Generates random air quality values between 100-500
- Updates every 5 seconds to simulate real sensor readings
- All controls work with local state management

### Service Layer Architecture
The code is structured with a service layer (`climateService.ts`) that abstracts data operations:
- `ClimateService` interface defines the contract
- `MockClimateService` provides current simulation functionality
- `FirebaseClimateService` is ready for future Firebase integration
- Easy to switch between implementations by changing the `USE_MOCK_SERVICE` flag

## Firebase Integration (Future)

When ready to connect to real Firebase, you'll need to:

1. Set `USE_MOCK_SERVICE = false` in `climateService.ts`
2. Implement the Firebase functions in `FirebaseClimateService`:
   - Read from `/climate/{roomId}/state`
   - Write commands to `/climate/{roomId}/cmd`
   - Subscribe to real-time updates

3. Expected Firebase data structure:
```json
{
  "climate": {
    "roomA": {
      "state": {
        "ts": 1234567890,
        "temperature": 26.5,
        "aqRaw": 180,
        "aqStatus": "Good",
        "fan": { "on": true, "pwm": 160 },
        "mode": "auto",
        "boostMode": false
      },
      "cmd": {
        "mode": "manual",
        "fan": { "on": true, "pwm": 200 },
        "boostMode": true,
        "boostEndTime": 1234567890
      }
    }
  }
}
```

## Running the Application

```bash
cd web
npm run dev
```

The application will start on `http://localhost:5173` and the climate module will be visible on the main dashboard with live simulated data.

## File Structure

```
web/src/
├── components/
│   ├── Climate.tsx          # Main climate component with logic
│   ├── ClimateTiles.tsx     # UI tiles and controls
│   └── ClimateTiles.css     # Styling for climate components
├── services/
│   └── climateService.ts    # Service layer for data operations
└── types.ts                 # TypeScript interfaces and constants
```

## Styling

The climate module follows the same design patterns as the existing lighting system:
- Glass-morphism design with backdrop blur
- Consistent color scheme with status indicators
- Responsive grid layout
- Smooth transitions and hover effects
- Dark theme optimized
