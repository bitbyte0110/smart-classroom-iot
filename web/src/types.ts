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

// Constants from requirements
export const BRIGHT_THRESHOLD = 2800;
export const DARK_THRESHOLD = 3200;
export const ROOM_ID = 'roomA';