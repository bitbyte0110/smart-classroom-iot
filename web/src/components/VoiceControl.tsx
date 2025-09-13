import React, { useState, useEffect, useRef } from 'react';
import './VoiceControl.css';

interface VoiceControlProps {
  onLightingControl?: (command: string) => void;
  onClimateControl?: (command: string) => void;
  onModeChange?: (mode: 'auto' | 'manual') => void;
  isListening: boolean;
  onToggleListening: () => void;
  currentModule: 'lighting' | 'climate';
}

export default function VoiceControl({ 
  onLightingControl, 
  onClimateControl, 
  onModeChange, 
  isListening, 
  onToggleListening,
  currentModule 
}: VoiceControlProps) {
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(interimTranscript);
        
        if (finalTranscript) {
          console.log('🎤 Voice command:', finalTranscript);
          processVoiceCommand(finalTranscript.toLowerCase().trim());
          setTranscript(''); // Clear after processing
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Don't show error for "aborted" - it's usually user-initiated
        if (event.error === 'aborted') {
          console.log('🎤 Voice recognition aborted (user action)');
          setError(''); // Clear any existing error
          return; // Don't stop listening or show error
        }
        
        // Only show error for actual problems
        if (event.error === 'network' || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError(`Voice recognition error: ${event.error}`);
          onToggleListening(); // Stop listening on real errors
        } else {
          // For other errors, just log them but don't show to user
          console.warn('Voice recognition warning:', event.error);
          setError(''); // Clear any existing error
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          // Restart if we're supposed to be listening
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        }
      };
    } else {
      setIsSupported(false);
      setError('Voice recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const processVoiceCommand = (command: string) => {
    console.log(`🎯 Processing voice command: "${command}"`);
    
    // Common commands that work for both modules
    if (command.includes('auto') || command.includes('automatic')) {
      onModeChange?.('auto');
      return;
    }
    
    if (command.includes('manual')) {
      onModeChange?.('manual');
      return;
    }

    // Module-specific commands
    if (currentModule === 'lighting') {
      processLightingCommand(command);
    } else if (currentModule === 'climate') {
      processClimateCommand(command);
    }
  };

  const processLightingCommand = (command: string) => {
    if (command.includes('light on') || command.includes('turn on light') || command.includes('lights on')) {
      onLightingControl?.('on');
    } else if (command.includes('light off') || command.includes('turn off light') || command.includes('lights off')) {
      onLightingControl?.('off');
    } else if (command.includes('bright') || command.includes('brighter')) {
      onLightingControl?.('brighter');
    } else if (command.includes('dim') || command.includes('dimmer')) {
      onLightingControl?.('dimmer');
    } else if (command.includes('max') || command.includes('maximum') || command.includes('full')) {
      onLightingControl?.('max');
    } else if (command.includes('min') || command.includes('minimum') || command.includes('low')) {
      onLightingControl?.('min');
    } else if (command.includes('medium') || command.includes('mid')) {
      onLightingControl?.('medium');
    }
  };

  const processClimateCommand = (command: string) => {
    if (command.includes('fan on') || command.includes('turn on fan') || command.includes('start fan')) {
      onClimateControl?.('fan_on');
    } else if (command.includes('fan off') || command.includes('turn off fan') || command.includes('stop fan')) {
      onClimateControl?.('fan_off');
    } else if (command.includes('fan high') || command.includes('fan max') || command.includes('maximum fan')) {
      onClimateControl?.('fan_high');
    } else if (command.includes('fan low') || command.includes('fan min') || command.includes('minimum fan')) {
      onClimateControl?.('fan_low');
    } else if (command.includes('fan medium') || command.includes('fan mid')) {
      onClimateControl?.('fan_medium');
    } else if (command.includes('boost') || command.includes('turbo')) {
      onClimateControl?.('boost');
    }
  };

  const handleToggleListening = () => {
    if (!isSupported) return;
    
    // Prevent rapid clicking
    if (recognitionRef.current?.state === 'starting' || recognitionRef.current?.state === 'stopping') {
      console.log('🎤 Voice recognition is busy, please wait...');
      return;
    }
    
    if (isListening) {
      console.log('🎤 Stopping voice recognition...');
      recognitionRef.current?.stop();
    } else {
      console.log('🎤 Starting voice recognition...');
      setError('');
      setTranscript('');
      recognitionRef.current?.start();
    }
    onToggleListening();
  };

  if (!isSupported) {
    return (
      <div className="voice-control unsupported">
        <div className="voice-icon">🎤</div>
        <div className="voice-text">
          <h4>Voice Control</h4>
          <p>Not supported in this browser</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-control">
      <div className="voice-header">
        <div className="voice-icon">🎤</div>
        <div className="voice-text">
          <h4>Voice Control</h4>
          <p>{isListening ? 'Listening...' : 'Click to start'}</p>
        </div>
        <button 
          className={`voice-toggle ${isListening ? 'listening' : ''}`}
          onClick={handleToggleListening}
          disabled={!isSupported}
        >
          {isListening ? '⏹️ Stop' : '▶️ Start'}
        </button>
      </div>

      {transcript && (
        <div className="voice-transcript">
          <span className="transcript-label">You said:</span>
          <span className="transcript-text">"{transcript}"</span>
        </div>
      )}

      {error && (
        <div className="voice-error">
          ⚠️ {error}
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
            {error.includes('not-allowed') && 'Please allow microphone access and refresh the page'}
            {error.includes('network') && 'Check your internet connection'}
            {error.includes('service-not-allowed') && 'Voice recognition service is not available'}
          </div>
        </div>
      )}

      <div className="voice-commands">
        <h5>Try saying:</h5>
        <div className="command-examples">
          {currentModule === 'lighting' ? (
            <>
              <span>"Turn on light"</span>
              <span>"Light off"</span>
              <span>"Make it brighter"</span>
              <span>"Dim the light"</span>
              <span>"Maximum brightness"</span>
              <span>"Switch to auto mode"</span>
            </>
          ) : (
            <>
              <span>"Turn on fan"</span>
              <span>"Fan off"</span>
              <span>"Fan high speed"</span>
              <span>"Fan low speed"</span>
              <span>"Boost mode"</span>
              <span>"Switch to manual mode"</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
