// Shared types for the smart lighting system
export interface LightingState {
  ts: number;
  presence: boolean;
  ldrRaw: number; // 0-4095
  mode: 'auto' | 'manual';
  led: {
    on: boolean;
    pwm: number; // 0-255
  };
  sensorError: string | null;
}

// Types for the smart climate control system
export interface ClimateState {
  ts: number;
  tempC: number;
  humidity: number;
  aqRaw: number; // MQ-135 raw reading
  aqStatus: 'Good' | 'Moderate' | 'Poor';
  mode: 'auto' | 'manual';
  fan: {
    on: boolean;
    pwm: number; // 0-255
  };
  comfortBand: 'Low' | 'Moderate' | 'High' | 'Idle';
  presence: boolean;
  systemActive: boolean;
  boostMode: boolean;
  sensorError: string | null;
}

export interface LightingLog extends LightingState {
  // Logs have the same structure as state
}

export interface ClimateLog extends ClimateState {
  // Logs have the same structure as state
}

export interface DashboardTile {
  title: string;
  value: string | number | boolean;
  unit?: string;
  status?: 'success' | 'warning' | 'error';
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }>;
}

// Climate Control Module Types
export interface ClimateState {
  ts: number;
  presence: boolean; // From AI detection (same as lighting)
  tempC: number; // DHT22 temperature
  humidity: number; // DHT22 humidity
  aqRaw: number; // MQ-135 air quality raw value
  aqStatus: 'Good' | 'Moderate' | 'Poor';
  mode: 'auto' | 'manual';
  fan: {
    on: boolean;
    pwm: number; // 0-255
  };
  comfortBand: 'Low' | 'Moderate' | 'High';
  sensorError: string | null;
}

export interface ClimateLog extends ClimateState {
  // Logs have the same structure as state
}

// Constants from requirements
export const BRIGHT_THRESHOLD = 2800;
export const DARK_THRESHOLD = 3200;
export const ROOM_ID = 'roomA';

// Climate control constants (from instruction.md)
export const TEMP_LOW_MAX = 25.0;  // ≤25°C → LOW
export const TEMP_MED_MAX = 28.0;  // 25.1-28°C → MED, ≥28.1°C → HIGH
export const AQ_GOOD_MAX = 300;    // 0-300 → Good
export const AQ_MODERATE_MAX = 400; // 301-400 → Moderate, ≥401 → Poor