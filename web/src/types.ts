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

export interface LightingLog extends LightingState {
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

// Climate/Fan system types
export interface ClimateState {
  ts: number;
  temperature: number; // °C
  aqRaw: number; // Air Quality raw value (100-500)
  aqStatus: 'Good' | 'Moderate' | 'Poor';
  fan: {
    on: boolean;
    pwm: number; // 0-255
  };
  mode: 'auto' | 'manual';
  boostMode: boolean;
  boostEndTime?: number; // timestamp when boost mode ends
}

// Constants from requirements
export const BRIGHT_THRESHOLD = 2800;
export const DARK_THRESHOLD = 3200;
export const ROOM_ID = 'roomA';

// Climate thresholds
export const AQ_GOOD_THRESHOLD = 200;
export const AQ_MODERATE_THRESHOLD = 350;