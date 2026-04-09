import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import voiceNavigationService from '../services/voiceNavigationService';

const VoiceNavigationContext = createContext();

export const useVoiceNavigationContext = () => {
  const context = useContext(VoiceNavigationContext);
  if (!context) {
    throw new Error('useVoiceNavigationContext must be used within VoiceNavigationProvider');
  }
  return context;
};

export const VoiceNavigationProvider = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const listeningTimeoutRef = useRef(null);
  const restartTimeoutRef = useRef(null);

  // Auto-stop listening after 5 seconds and restart if enabled
  const startAutoRestartCycle = useCallback(() => {
    if (!isEnabled) return;

    const startListening = async () => {
      try {
        setError(null);
        setIsListening(true);
        
        const started = await voiceNavigationService.startListening();
        if (!started) {
          throw new Error('Failed to start voice recording');
        }

        // Auto-stop after 5 seconds
        listeningTimeoutRef.current = setTimeout(async () => {
          try {
            setIsProcessing(true);
            const result = await voiceNavigationService.stopListening();
            
            console.log('Voice command result:', result);
            
            if (result.route) {
              navigate(result.route);
              setFeedback({
                success: true,
                message: `Navigating to ${result.command}`,
                route: result.route
              });
            } else {
              setFeedback({
                success: false,
                message: `Command "${result.command}" not recognized`,
                suggestions: result.suggestions
              });
            }

            // Clear feedback after 2 seconds
            setTimeout(() => setFeedback(null), 2000);

            // Restart listening cycle after 1 second if still enabled
            if (isEnabled) {
              restartTimeoutRef.current = setTimeout(() => {
                startListening();
              }, 1000);
            }
          } catch (err) {
            console.error('Voice processing error:', err);
            setError(err.message);
            
            // Retry after 2 seconds if still enabled
            if (isEnabled) {
              restartTimeoutRef.current = setTimeout(() => {
                startListening();
              }, 2000);
            }
          } finally {
            setIsListening(false);
            setIsProcessing(false);
          }
        }, 5000);
      } catch (err) {
        console.error('Voice start error:', err);
        setError(err.message);
        setIsListening(false);
        setIsProcessing(false);
        
        // Retry after 3 seconds if still enabled
        if (isEnabled) {
          restartTimeoutRef.current = setTimeout(() => {
            startListening();
          }, 3000);
        }
      }
    };

    startListening();
  }, [isEnabled, navigate]);

  // Toggle voice navigation on/off
  const toggleVoiceNavigation = useCallback(() => {
    if (isEnabled) {
      // Turn off
      setIsEnabled(false);
      setIsListening(false);
      setIsProcessing(false);
      setError(null);
      setFeedback(null);
      
      // Clear all timeouts
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      
      // Cleanup voice service
      voiceNavigationService.cleanup();
      
      console.log('Voice navigation disabled');
    } else {
      // Turn on
      setIsEnabled(true);
      console.log('Voice navigation enabled');
    }
  }, [isEnabled]);

  // Start/restart listening cycle when enabled changes
  useEffect(() => {
    if (isEnabled) {
      startAutoRestartCycle();
    } else {
      // Cleanup when disabled
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      voiceNavigationService.cleanup();
    }

    return () => {
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [isEnabled, startAutoRestartCycle]);

  const value = {
    isEnabled,
    isListening,
    isProcessing,
    feedback,
    error,
    toggleVoiceNavigation
  };

  return (
    <VoiceNavigationContext.Provider value={value}>
      {children}
    </VoiceNavigationContext.Provider>
  );
};
