/**
 * Speech-to-Text Service
 * Handles audio recording and transcription using Sarvam AI
 */

const API_BASE = ""; // Use relative paths so Vite proxy works on mobile (via ngrok)

class SpeechToTextService {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
  }

  /**
   * Start recording audio from the microphone
   * @returns {Promise<void>}
   */
  async startRecording() {
    try {
      if (this.isRecording) {
        console.warn('Already recording');
        return;
      }

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      // Create MediaRecorder instance
      const options = {
        mimeType: 'audio/webm;codecs=opus',
      };

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.audioChunks = [];

      // Collect audio data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error(
        error.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone access in your browser settings.'
          : 'Failed to start recording. Please check your microphone.'
      );
    }
  }

  /**
   * Stop recording and transcribe the audio
   * @returns {Promise<{transcript: string, language: string}>}
   */
  async stopRecordingAndTranscribe() {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          console.log('Recording stopped, processing audio...');

          // Create audio blob
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          
          // Stop all tracks to release microphone
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }

          this.isRecording = false;

          // Check if audio is too short
          if (audioBlob.size < 1000) {
            reject(new Error('Recording too short. Please speak clearly for at least 1 second.'));
            return;
          }

          // Transcribe the audio
          const result = await this.transcribeAudio(audioBlob);
          resolve(result);
        } catch (error) {
          console.error('Error processing recording:', error);
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Transcribe audio using Sarvam AI via backend proxy
   * @param {Blob} audioBlob - The audio blob to transcribe
   * @returns {Promise<{transcript: string, language: string}>}
   */
  async transcribeAudio(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('model', 'saaras:v3');

      const response = await fetch(`${API_BASE}/api/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          throw new Error('Voice service is busy. Please try again in a moment.');
        }
        
        throw new Error(
          errorData.error || `Transcription failed with status ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.transcript || data.transcript.trim().length === 0) {
        throw new Error('No speech detected. Please speak clearly and try again.');
      }

      console.log('Transcription result:', data);
      return {
        transcript: data.transcript.trim(),
        language: data.language || 'unknown',
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  /**
   * Cancel the current recording
   */
  cancelRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.audioChunks = [];
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.isRecording = false;
  }

  /**
   * Check if currently recording
   * @returns {boolean}
   */
  getIsRecording() {
    return this.isRecording;
  }
}

// Export singleton instance
export const speechToTextService = new SpeechToTextService();
