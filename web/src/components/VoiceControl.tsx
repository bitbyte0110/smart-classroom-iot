import { useState, useEffect, useRef } from 'react';
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
  // Local, immediate flags to avoid race conditions with prop updates
  const isActiveRef = useRef(false); // true while we should process results and allow restart
  const suppressResultsRef = useRef(false); // blocks stray results after stopping

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
        // Ignore any results that arrive after we've clicked Stop
        if (!isActiveRef.current || suppressResultsRef.current) {
          return;
        }
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
        // Only restart if we are actively supposed to be listening
        if (isActiveRef.current) {
          // Restart if we're supposed to be listening
          setTimeout(() => {
            if (isActiveRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        } else {
          console.log('🎤 Voice recognition ended - not restarting');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array since we use refs for current values

  const processVoiceCommand = (command: string) => {
    console.log(`🎯 Processing voice command: "${command}"`);
    console.log(`🎯 Current module: ${currentModule}`);
    
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
      console.log(`🎯 Processing as lighting command`);
      processLightingCommand(command);
    } else if (currentModule === 'climate') {
      console.log(`🎯 Processing as climate command`);
      processClimateCommand(command);
    }
  };

  const processLightingCommand = (command: string) => {
    console.log(`🎯 Processing lighting command: "${command}"`);
    
    // Turn on light commands - exact matches
    if (command.includes('turn on light') || command.includes('turn on the light')) {
      console.log('✅ Voice: Light ON (Manual Mode) - Setting PWM to 128');
      onLightingControl?.('on');
    } 
    // Turn off light commands - exact matches
    else if (command.includes('turn off light') || command.includes('turn off the light')) {
      console.log('✅ Voice: Light OFF (Manual Mode) - Setting PWM to 0');
      onLightingControl?.('off');
    } 
    // Increase brightness commands - exact matches
    else if (command.includes('increase brightness') || command.includes('increase the brightness') || command.includes('increase light') || command.includes('increase the light')) {
      console.log('✅ Voice: INCREASE BRIGHTNESS (50% increase, Manual Mode)');
      onLightingControl?.('brighter');
    } 
    // Decrease brightness commands - exact matches
    else if (command.includes('lower light') || command.includes('lower the light') || command.includes('lower the brightness') || command.includes('lower brightness')) {
      console.log('✅ Voice: LOWER LIGHT (50% decrease, Manual Mode)');
      console.log('🎤 Calling onLightingControl with command: "dimmer"');
      onLightingControl?.('dimmer');
    } 
    // Maximum brightness commands - exact matches
    else if (command.includes('maximum brightness') || command.includes('maximum the brightness')) {
      console.log('✅ Voice: MAXIMUM BRIGHTNESS (PWM=255, Manual Mode)');
      onLightingControl?.('max');
    } 
    else {
      console.log('❌ Voice: Lighting command not recognized');
    }
  };

  const processClimateCommand = (command: string) => {
    console.log(`🎯 Processing climate command: "${command}"`);
    
    // Turn on fan commands - exact matches
    if (command.includes('turn on fan') || command.includes('turn on the fan')) {
      console.log('✅ Voice: Fan ON (Manual Mode) - Setting PWM to 128');
      onClimateControl?.('fan_on');
    } 
    // Turn off fan commands - exact matches
    else if (command.includes('turn off fan') || command.includes('turn off the fan')) {
      console.log('✅ Voice: Fan OFF (Manual Mode) - Setting PWM to 0');
      onClimateControl?.('fan_off');
    } 
    // Increase fan speed commands - exact matches
    else if (command.includes('increase fan speed') || command.includes('increase the fan speed')) {
      console.log('✅ Voice: INCREASE FAN SPEED (50% increase, Manual Mode)');
      onClimateControl?.('fan_increase');
    } 
    // Decrease fan speed commands - exact matches
    else if (command.includes('lower fan speed') || command.includes('lower the fan speed')) {
      console.log('✅ Voice: LOWER FAN SPEED (50% decrease, Manual Mode)');
      onClimateControl?.('fan_low');
    } 
    // Maximum fan speed commands - exact matches
    else if (command.includes('fan maximum speed') || command.includes('fan maximum the speed') || command.includes('maximum fan speed')) {
      console.log('✅ Voice: FAN MAXIMUM SPEED (PWM=255, Manual Mode)');
      onClimateControl?.('fan_high');
    } 
    else {
      console.log('❌ Voice: Climate command not recognized');
    }
  };

  const handleToggleListening = () => {
    if (!isSupported) return;
    
    if (isListening) {
      console.log('🎤 Stopping voice recognition...');
      // Set flags to immediately block results and restarts
      isActiveRef.current = false;
      suppressResultsRef.current = true;
      // Abort cancels immediately without producing more results
      if (recognitionRef.current) {
        // Prefer abort for immediate cancellation without extra results
        if (typeof recognitionRef.current.abort === 'function') {
          recognitionRef.current.abort();
        } else {
          recognitionRef.current.stop();
        }
      }
    } else {
      console.log('🎤 Starting voice recognition...');
      setError('');
      setTranscript('');
      suppressResultsRef.current = false;
      isActiveRef.current = true;
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
              <span>"Turn off light"</span>
              <span>"Increase brightness"</span>
              <span>"Lower the light"</span>
              <span>"Maximum brightness"</span>
              <span>"Switch to auto mode"</span>
            </>
          ) : (
            <>
              <span>"Turn on fan"</span>
              <span>"Turn off fan"</span>
              <span>"Increase fan speed"</span>
              <span>"Maximum fan speed"</span>
              <span>"Lower fan speed"</span>
              <span>"Switch to manual mode"</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
