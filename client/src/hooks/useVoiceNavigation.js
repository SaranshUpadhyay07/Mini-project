import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import voiceNavigationService from '../services/voiceNavigationService';

export const useVoiceNavigation = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const startVoiceNavigation = useCallback(async () => {
    try {
      setError(null);
      setIsListening(true);
      
      const started = await voiceNavigationService.startListening();
      if (!started) {
        throw new Error('Failed to start voice recording');
      }
    } catch (err) {
      setError(err.message);
      setIsListening(false);
    }
  }, []);

  const stopVoiceNavigation = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      const result = await voiceNavigationService.stopListening();
      setLastCommand(result);
      
      if (result.route) {
        // Navigate to the detected route
        navigate(result.route);
        return {
          success: true,
          message: `Navigating to ${result.command}`,
          route: result.route
        };
      } else {
        return {
          success: false,
          message: `Command "${result.command}" not recognized`,
          suggestions: result.suggestions
        };
      }
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        message: err.message
      };
    } finally {
      setIsListening(false);
      setIsProcessing(false);
    }
  }, [navigate]);

  const cancelVoiceNavigation = useCallback(() => {
    voiceNavigationService.cleanup();
    setIsListening(false);
    setIsProcessing(false);
    setError(null);
  }, []);

  return {
    isListening,
    isProcessing,
    lastCommand,
    error,
    startVoiceNavigation,
    stopVoiceNavigation,
    cancelVoiceNavigation
  };
};
