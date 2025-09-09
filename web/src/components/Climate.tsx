import { useState, useEffect, useCallback } from 'react';
import type { ClimateState } from '../types';
import { AQ_GOOD_THRESHOLD, AQ_MODERATE_THRESHOLD, ROOM_ID } from '../types';
import { climateService, initializeMockClimateService } from '../services/climateService';
import ClimateTiles from './ClimateTiles';

// Mock data generation functions
const generateMockTemperature = (): number => {
  return Math.random() * (32 - 23) + 23; // 23-32°C
};

const generateMockAqRaw = (): number => {
  return Math.floor(Math.random() * (500 - 100) + 100); // 100-500
};

const getAqStatus = (aqRaw: number): 'Good' | 'Moderate' | 'Poor' => {
  if (aqRaw < AQ_GOOD_THRESHOLD) return 'Good';
  if (aqRaw < AQ_MODERATE_THRESHOLD) return 'Moderate';
  return 'Poor';
};

// Auto mode fan control logic
const calculateAutoFanSpeed = (temperature: number): { on: boolean; pwm: number } => {
  if (temperature < 25) {
    return { on: true, pwm: 90 }; // LOW
  } else if (temperature <= 29) {
    return { on: true, pwm: 160 }; // MEDIUM
  } else {
    return { on: true, pwm: 230 }; // HIGH
  }
};

// Helper function to create initial mock state
const createInitialMockState = (): ClimateState => {
  const temperature = generateMockTemperature();
  const aqRaw = generateMockAqRaw();
  const autoFan = calculateAutoFanSpeed(temperature);
  
  return {
    ts: Date.now(),
    temperature,
    aqRaw,
    aqStatus: getAqStatus(aqRaw),
    fan: autoFan,
    mode: 'auto',
    boostMode: false
  };
};

export default function Climate() {
  const [state, setState] = useState<ClimateState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>('');


  // Update sensors and apply auto mode rules
  const updateSensorsAndAutoMode = useCallback((currentState: ClimateState): ClimateState => {
    const newTemperature = generateMockTemperature();
    const newAqRaw = generateMockAqRaw();
    
    let newState: ClimateState = {
      ...currentState,
      ts: Date.now(),
      temperature: newTemperature,
      aqRaw: newAqRaw,
      aqStatus: getAqStatus(newAqRaw)
    };

    // Apply auto mode rules if in auto mode and not in boost
    if (newState.mode === 'auto' && !newState.boostMode) {
      const autoFan = calculateAutoFanSpeed(newTemperature);
      newState.fan = autoFan;
    }

    // Handle boost mode timeout
    if (newState.boostMode && newState.boostEndTime && Date.now() >= newState.boostEndTime) {
      newState.boostMode = false;
      delete newState.boostEndTime;
      
      // Return to auto mode rules if in auto mode
      if (newState.mode === 'auto') {
        const autoFan = calculateAutoFanSpeed(newTemperature);
        newState.fan = autoFan;
      }
    }

    return newState;
  }, []);

  // Initialize state on component mount
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Try to read existing state from service
        const existingState = await climateService.readState(ROOM_ID);
        
        if (existingState) {
          setState(existingState);
          setIsConnected(true);
        } else {
          // Initialize with mock data
          const initialState = createInitialMockState();
          setState(initialState);
          setError('Demo mode - Using simulated climate data');
          
          // Initialize the mock service with this state
          initializeMockClimateService(initialState);
        }
      } catch (err) {
        console.error('Climate initialization error:', err);
        setError('Failed to initialize climate system');
        const initialState = createInitialMockState();
        setState(initialState);
        initializeMockClimateService(initialState);
      }
    };

    initializeState();
  }, []);

  // Set up mock data updates every 5 seconds
  useEffect(() => {
    if (!state) return;

    const interval = setInterval(() => {
      setState(currentState => {
        if (!currentState) return currentState;
        return updateSensorsAndAutoMode(currentState);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [state, updateSensorsAndAutoMode]);

  // Handle mode changes
  const handleModeChange = async (newMode: 'auto' | 'manual') => {
    if (!state) return;

    let newState = { ...state, mode: newMode };

    // If switching to auto mode, apply auto rules immediately
    if (newMode === 'auto' && !newState.boostMode) {
      const autoFan = calculateAutoFanSpeed(state.temperature);
      newState.fan = autoFan;
    }

    setState(newState);

    try {
      await climateService.writeCommand(ROOM_ID, { mode: newMode });
    } catch (error) {
      console.error('Mode change failed:', error);
      setError('Mode change failed - check connection');
    }
  };

  // Handle fan toggle (manual mode only)
  const handleFanToggle = async () => {
    if (!state || state.mode !== 'manual') return;

    const newFanState = { ...state.fan, on: !state.fan.on };
    if (!newFanState.on) {
      newFanState.pwm = 0;
    }

    setState({ ...state, fan: newFanState });

    try {
      await climateService.writeCommand(ROOM_ID, { fan: newFanState });
    } catch (error) {
      console.error('Fan toggle failed:', error);
      setError('Fan control failed - check connection');
    }
  };

  // Handle PWM changes (manual mode only)
  const handlePwmChange = async (pwm: number) => {
    if (!state || state.mode !== 'manual') return;

    const newFanState = { ...state.fan, pwm, on: pwm > 0 };
    setState({ ...state, fan: newFanState });

    try {
      await climateService.writeCommand(ROOM_ID, { fan: newFanState });
    } catch (error) {
      console.error('PWM change failed:', error);
      setError('Fan control failed - check connection');
    }
  };

  // Handle boost mode toggle
  const handleBoostToggle = async () => {
    if (!state) return;

    const isActivatingBoost = !state.boostMode;
    let newState = { ...state };

    if (isActivatingBoost) {
      // Activate boost mode
      newState.boostMode = true;
      newState.boostEndTime = Date.now() + (10 * 60 * 1000); // 10 minutes
      newState.fan = { on: true, pwm: 255 }; // Maximum speed
    } else {
      // Deactivate boost mode
      newState.boostMode = false;
      delete newState.boostEndTime;
      
      // Return to appropriate mode
      if (newState.mode === 'auto') {
        const autoFan = calculateAutoFanSpeed(state.temperature);
        newState.fan = autoFan;
      }
      // In manual mode, keep current settings
    }

    setState(newState);

    try {
      await climateService.writeCommand(ROOM_ID, { 
        boostMode: newState.boostMode,
        boostEndTime: newState.boostEndTime,
        fan: newState.fan
      });
    } catch (error) {
      console.error('Boost toggle failed:', error);
      setError('Boost control failed - check connection');
    }
  };

  if (!state) {
    return (
      <div className="climate-loading">
        <div className="loader">
          <div className="spinner"></div>
          <p>Initializing Climate Control System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="climate-wrapper">
      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}
      
      <ClimateTiles
        state={state}
        onModeChange={handleModeChange}
        onFanToggle={handleFanToggle}
        onPwmChange={handlePwmChange}
        onBoostToggle={handleBoostToggle}
      />
    </div>
  );
}
