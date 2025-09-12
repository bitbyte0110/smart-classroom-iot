import { ref, onValue, set, push, query, orderByChild, limitToLast, startAt, off } from 'firebase/database';
import { db } from '../firebase';

// Type definitions
export type FanMode = "Auto" | "Manual";
export type AQStatus = "Good" | "Moderate" | "Poor" | "Unknown";

export interface ClimateState {
  updatedAt: number; // ms epoch
  tempC?: number;
  humidity?: number;
  aqRaw?: number;
  aqStatus?: AQStatus;
  mode?: FanMode;
  fan?: {
    on: boolean;
    pwm: number;
  };
  presence?: boolean;
}

export interface ClimateLogEntry {
  timestamp: number; // ms epoch
  tempC?: number;
  humidity?: number;
  aqRaw?: number;
  aqStatus?: AQStatus;
  mode?: FanMode;
  fan?: {
    on: boolean;
    pwm: number;
  };
  presence?: boolean;
}

export interface ClimateCommand {
  issuedAt: number;
  mode?: FanMode;
  fan?: {
    on?: boolean;
    pwm?: number;
  };
  boost?: {
    enabled: boolean;
    minutes: number;
  };
}

// Realtime Database helpers
export function subscribeClimateState(
  roomId: string, 
  callback: (state: ClimateState | null) => void
): () => void {
  const stateRef = ref(db, `climate/${roomId}/state`);
  
  const unsubscribe = onValue(stateRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  }, (error) => {
    console.error('Error subscribing to climate state:', error);
    callback(null);
  });

  return () => off(stateRef, 'value', unsubscribe);
}

export async function readClimateState(roomId: string): Promise<ClimateState | null> {
  return new Promise((resolve) => {
    const stateRef = ref(db, `climate/${roomId}/state`);
    onValue(stateRef, (snapshot) => {
      resolve(snapshot.val());
    }, { onlyOnce: true });
  });
}

export function subscribeClimateLogs(
  roomId: string,
  callback: (logs: ClimateLogEntry[]) => void,
  options?: { lastN?: number; sinceMs?: number }
): () => void {
  const logsRef = ref(db, `climate/${roomId}/logs`);
  
  let logsQuery = query(logsRef, orderByChild('timestamp'));
  
  if (options?.sinceMs) {
    logsQuery = query(logsQuery, startAt(options.sinceMs));
  }
  
  if (options?.lastN) {
    logsQuery = query(logsQuery, limitToLast(options.lastN));
  }

  const unsubscribe = onValue(logsQuery, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const logs = Object.values(data) as ClimateLogEntry[];
      logs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      callback(logs);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error('Error subscribing to climate logs:', error);
    callback([]);
  });

  return () => off(logsRef, 'value', unsubscribe);
}

// Command writers
export async function setClimateCommand(roomId: string, partialCmd: Partial<ClimateCommand>): Promise<void> {
  const cmdRef = ref(db, `climate/${roomId}/cmd`);
  const command: ClimateCommand = {
    issuedAt: Date.now(),
    ...partialCmd
  };
  
  try {
    await set(cmdRef, command);
  } catch (error) {
    console.error('Error setting climate command:', error);
    throw error;
  }
}

// Convenience command functions
export async function setMode(roomId: string, mode: FanMode): Promise<void> {
  return setClimateCommand(roomId, { mode });
}

export async function setFanOn(roomId: string, on: boolean): Promise<void> {
  return setClimateCommand(roomId, { 
    fan: { on }
  });
}

export async function setFanPWM(roomId: string, pwm: number): Promise<void> {
  // Clamp PWM to valid range
  const clampedPWM = Math.max(0, Math.min(255, Math.round(pwm)));
  return setClimateCommand(roomId, { 
    fan: { pwm: clampedPWM }
  });
}

export async function boostHigh(roomId: string, minutes: number = 10): Promise<void> {
  return setClimateCommand(roomId, { 
    boost: { 
      enabled: true, 
      minutes 
    }
  });
}

// Utility functions
export function deriveAQStatus(aqRaw?: number): AQStatus {
  if (aqRaw === undefined || aqRaw === null || isNaN(aqRaw)) {
    return "Unknown";
  }
  
  // Based on typical MQ-135 thresholds
  if (aqRaw < 200) return "Good";
  if (aqRaw < 400) return "Moderate";
  return "Poor";
}

export function comfortBand(tempC?: number): string {
  if (tempC === undefined || tempC === null || isNaN(tempC)) {
    return "Unknown";
  }
  
  if (tempC < 25) return "Low";
  if (tempC <= 29) return "Moderate";
  return "High";
}

export function toCSV(logs: ClimateLogEntry[]): string {
  const headers = [
    'timestamp',
    'iso',
    'tempC',
    'humidity',
    'mode',
    'fan.on',
    'fan.pwm',
    'comfortBand',
    'aqRaw',
    'aqStatus',
    'presence'
  ];
  
  const rows = logs.map(log => [
    log.timestamp || '',
    log.timestamp ? new Date(log.timestamp).toISOString() : '',
    log.tempC || '',
    log.humidity || '',
    log.mode || '',
    log.fan?.on ?? '',
    log.fan?.pwm ?? '',
    comfortBand(log.tempC),
    log.aqRaw || '',
    log.aqStatus || deriveAQStatus(log.aqRaw),
    log.presence ?? ''
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
}

// Validation utilities
export function validateClimateData(data: any): string[] {
  const warnings: string[] = [];
  
  if (data.tempC !== undefined) {
    if (isNaN(data.tempC) || data.tempC < -50 || data.tempC > 100) {
      warnings.push(`Invalid temperature: ${data.tempC}°C`);
    }
  }
  
  if (data.humidity !== undefined) {
    if (isNaN(data.humidity) || data.humidity < 0 || data.humidity > 100) {
      warnings.push(`Invalid humidity: ${data.humidity}%`);
    }
  }
  
  if (data.aqRaw !== undefined) {
    if (isNaN(data.aqRaw) || data.aqRaw < 0 || data.aqRaw > 4095) {
      warnings.push(`Invalid air quality reading: ${data.aqRaw}`);
    }
  }
  
  if (data.fan?.pwm !== undefined) {
    if (isNaN(data.fan.pwm) || data.fan.pwm < 0 || data.fan.pwm > 255) {
      warnings.push(`Invalid fan PWM: ${data.fan.pwm}`);
    }
  }
  
  return warnings;
}
