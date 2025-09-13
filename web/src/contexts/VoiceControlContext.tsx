import React, { createContext, useContext, useState, useCallback } from 'react';

interface VoiceControlContextType {
  onLightingControl: (command: string) => void;
  onClimateControl: (command: string) => void;
  onModeChange: (mode: 'auto' | 'manual') => void;
  setLightingHandler: (handler: (command: string) => void) => void;
  setClimateHandler: (handler: (command: string) => void) => void;
  setModeHandler: (handler: (mode: 'auto' | 'manual') => void) => void;
}

const VoiceControlContext = createContext<VoiceControlContextType | undefined>(undefined);

export function VoiceControlProvider({ children }: { children: React.ReactNode }) {
  const [lightingHandler, setLightingHandler] = useState<((command: string) => void) | null>(null);
  const [climateHandler, setClimateHandler] = useState<((command: string) => void) | null>(null);
  const [modeHandler, setModeHandler] = useState<((mode: 'auto' | 'manual') => void) | null>(null);

  const onLightingControl = useCallback((command: string) => {
    console.log('🎤 Global lighting command:', command);
    if (lightingHandler) {
      lightingHandler(command);
    } else {
      console.warn('No lighting handler registered');
    }
  }, [lightingHandler]);

  const onClimateControl = useCallback((command: string) => {
    console.log('🎤 Global climate command:', command);
    if (climateHandler) {
      climateHandler(command);
    } else {
      console.warn('No climate handler registered');
    }
  }, [climateHandler]);

  const onModeChange = useCallback((mode: 'auto' | 'manual') => {
    console.log('🎤 Global mode change:', mode);
    if (modeHandler) {
      modeHandler(mode);
    } else {
      console.warn('No mode handler registered');
    }
  }, [modeHandler]);

  return (
    <VoiceControlContext.Provider value={{
      onLightingControl,
      onClimateControl,
      onModeChange,
      setLightingHandler,
      setClimateHandler,
      setModeHandler
    }}>
      {children}
    </VoiceControlContext.Provider>
  );
}

export function useVoiceControl() {
  const context = useContext(VoiceControlContext);
  if (context === undefined) {
    throw new Error('useVoiceControl must be used within a VoiceControlProvider');
  }
  return context;
}
