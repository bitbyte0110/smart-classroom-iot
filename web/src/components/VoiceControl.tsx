import React, { useState, useEffect, useRef } from 'react';
import { useVoiceControl } from '../contexts/VoiceControlContext';
import './VoiceControl.css';

interface VoiceControlProps {
  currentModule: 'lighting' | 'climate';
}

export default function VoiceControl({ 
  currentModule 
}: VoiceControlProps) {
  const { onLightingControl, onClimateControl, onModeChange } = useVoiceControl();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState('');
  const [lastCommand, setLastCommand] = useState('');
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
          console.log('🎤 Global voice command:', finalTranscript);
          processGlobalVoiceCommand(finalTranscript.toLowerCase().trim());
          setTranscript(''); // Clear after processing
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Handle different error types more gracefully
        let errorMessage = '';
        switch (event.error) {
          case 'aborted':
            errorMessage = 'Voice recognition was interrupted. Try clicking Start again.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking louder.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not found. Please check your microphone.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage = `Voice recognition error: ${event.error}`;
        }
        
        setError(errorMessage);
        
        // Only stop listening for certain errors
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          setIsListening(false);
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          // Restart if we're supposed to be listening, but add a longer delay for aborted errors
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.warn('Failed to restart voice recognition:', error);
                setError('Failed to restart voice recognition. Please try clicking Start again.');
                setIsListening(false);
              }
            }
          }, 500); // Increased delay to prevent rapid restarts
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

  const processGlobalVoiceCommand = (command: string) => {
    console.log(`🎯 Processing global voice command: "${command}"`);
    setLastCommand(command);
    
    // Common commands that work for both modules
    if (command.includes('auto') || command.includes('automatic')) {
      onModeChange?.('auto');
      return;
    }
    
    if (command.includes('manual')) {
      onModeChange?.('manual');
      return;
    }

    // Smart detection: Look for specific keywords to determine which system to control
    const isLightingCommand = command.includes('light') || 
                             command.includes('bright') || 
                             command.includes('dim') || 
                             command.includes('brightness') ||
                             command.includes('led') ||
                             command.includes('lamp');

    const isClimateCommand = command.includes('fan') || 
                            command.includes('temperature') || 
                            command.includes('temp') || 
                            command.includes('climate') ||
                            command.includes('air') ||
                            command.includes('boost') ||
                            command.includes('cool');

    // Process based on detected system or current module
    if (isLightingCommand) {
      processLightingCommand(command);
    } else if (isClimateCommand) {
      processClimateCommand(command);
    } else {
      // If no specific keywords, use current module
      if (currentModule === 'lighting') {
        processLightingCommand(command);
      } else {
        processClimateCommand(command);
      }
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
    console.log('🌡️ Processing climate command:', command);
    
    if (command.includes('fan on') || command.includes('turn on fan') || command.includes('start fan')) {
      onClimateControl?.('fan_on');
    } else if (command.includes('fan off') || command.includes('turn off fan') || command.includes('stop fan')) {
      onClimateControl?.('fan_off');
    } else if (command.includes('fan high') || command.includes('fan max') || command.includes('maximum fan') || command.includes('high speed')) {
      onClimateControl?.('fan_high');
    } else if (command.includes('fan low') || command.includes('fan min') || command.includes('minimum fan') || command.includes('low speed')) {
      onClimateControl?.('fan_low');
    } else if (command.includes('fan medium') || command.includes('fan mid') || command.includes('medium speed')) {
      onClimateControl?.('fan_medium');
    } else if (command.includes('boost') || command.includes('turbo') || command.includes('max fan')) {
      onClimateControl?.('boost');
    }
  };

  const handleToggleListening = () => {
    if (!isSupported) return;
    
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (error) {
        console.warn('Error stopping voice recognition:', error);
      }
    } else {
      setError('');
      setTranscript('');
      try {
        recognitionRef.current?.start();
      } catch (error) {
        console.error('Error starting voice recognition:', error);
        setError('Failed to start voice recognition. Please try again.');
        return; // Don't toggle state if start failed
      }
    }
    setIsListening(!isListening);
  };

  if (!isSupported) {
    return (
      <div className="voice-control unsupported">
        <div className="voice-icon">🎤</div>
        <div className="voice-text">
          <h4>Global Voice Control</h4>
          <p>Not supported in this browser</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-control global-voice">
      <div className="voice-header">
        <div className="voice-icon">🎤</div>
        <div className="voice-text">
          <h4>Global Voice Control</h4>
          <p>{isListening ? 'Listening...' : 'Click to start'}</p>
          <div className="current-module">
            Current: {currentModule === 'lighting' ? '💡 Lighting' : '🌡️ Climate'}
          </div>
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

      {lastCommand && (
        <div className="voice-last-command">
          <span className="command-label">Last command:</span>
          <span className="command-text">"{lastCommand}"</span>
        </div>
      )}

      {error && (
        <div className="voice-error">
          <div className="error-content">
            <span>⚠️ {error}</span>
            {error.includes('aborted') || error.includes('interrupted') ? (
              <button 
                className="retry-button"
                onClick={() => {
                  setError('');
                  setTranscript('');
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.start();
                      setIsListening(true);
                    } catch (err) {
                      console.error('Retry failed:', err);
                    }
                  }
                }}
              >
                🔄 Retry
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div className="voice-commands">
        <h5>Smart Commands (works from any tab):</h5>
        <div className="command-examples">
          <div className="command-group">
            <h6>💡 Lighting:</h6>
            <span>"Turn on light"</span>
            <span>"Light off"</span>
            <span>"Make it brighter"</span>
            <span>"Dim the light"</span>
            <span>"Maximum brightness"</span>
          </div>
          <div className="command-group">
            <h6>🌡️ Climate:</h6>
            <span>"Turn on fan"</span>
            <span>"Fan off"</span>
            <span>"Fan high speed"</span>
            <span>"Fan low speed"</span>
            <span>"Boost mode"</span>
          </div>
          <div className="command-group">
            <h6>⚙️ Mode:</h6>
            <span>"Switch to auto mode"</span>
            <span>"Switch to manual mode"</span>
          </div>
        </div>
      </div>
    </div>
  );
}
