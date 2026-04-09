import React from 'react';
import { useVoiceNavigationContext } from '../context/VoiceNavigationContext';
import { IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';

const PersistentVoiceButton = () => {
  const {
    isEnabled,
    isListening,
    isProcessing,
    feedback,
    error,
    toggleVoiceNavigation
  } = useVoiceNavigationContext();

  const getButtonState = () => {
    if (!isEnabled) return 'off';
    if (isProcessing) return 'processing';
    if (isListening) return 'listening';
    return 'waiting';
  };

  const buttonState = getButtonState();

  return (
    <>
      {/* Floating Voice Button */}
      <button
        onClick={toggleVoiceNavigation}
        className={`fixed bottom-4 left-4 lg:bottom-6 lg:left-auto lg:right-6 z-50 w-11 h-11 lg:w-14 lg:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          buttonState === 'off'
            ? 'bg-[#4F46E5] hover:bg-slate-600'
            : buttonState === 'listening'
            ? 'bg-gray-400 animate-pulse shadow-primary-600/50'
            : buttonState === 'processing'
            ? 'bg-primary-light animate-spin-slow'
            : 'bg-primary hover:bg-primary-light animate-breathing'
        }`}
        title={isEnabled ? 'Voice navigation ON - Click to turn OFF' : 'Voice navigation OFF - Click to turn ON'}
      >
        {isEnabled ? (
          <IconMicrophone size={24} className="text-white lg:w-7 lg:h-7" />
        ) : (
          <IconMicrophoneOff size={24} className="text-white lg:w-7 lg:h-7" />
        )}
      </button>

      {/* Status Indicator */}
      {isEnabled && (
        <div className="fixed bottom-20 left-4 lg:bottom-24 lg:left-auto lg:right-6 z-50 bg-white rounded-lg shadow-lg px-4 py-2 text-sm font-medium">
          {isProcessing ? (
            <span className="text-primary">Processing...</span>
          ) : isListening ? (
            <span className="text-red-600 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
              Listening
            </span>
          ) : (
            <span className="text-primary flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              Ready
            </span>
          )}
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`fixed top-20 right-4 lg:right-6 z-50 max-w-xs p-4 rounded-lg shadow-xl border-l-4 ${
            feedback.success
              ? 'bg-green-50 border-green-500'
              : 'bg-red-50 border-red-500'
          } animate-slide-down`}
        >
          <div className={`text-sm font-medium mb-1 ${
            feedback.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {feedback.message}
          </div>
          
          {feedback.suggestions && feedback.suggestions.length > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              <div className="font-semibold mb-1">Try saying:</div>
              <div className="flex flex-wrap gap-1">
                {feedback.suggestions.slice(0, 3).map((suggestion, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 bg-white rounded border border-gray-200"
                  >
                    "{suggestion}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-20 right-4 lg:right-6 z-50 max-w-xs p-4 rounded-lg shadow-xl bg-red-50 border-l-4 border-red-500 animate-slide-down">
          <div className="text-sm font-medium text-red-800">
            {error}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes breathing {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 10px 25px rgba(59, 130, 246, 0.5);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 15px 35px rgba(59, 130, 246, 0.6);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        
        .animate-breathing {
          animation: breathing 2s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </>
  );
};

export default PersistentVoiceButton;
