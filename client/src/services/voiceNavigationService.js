class VoiceNavigationService {
  constructor() {
    this.baseURL = ""; // Use relative paths so Vite proxy works on mobile (via ngrok)
    this.isListening = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    
    // Navigation commands mapping (English and Hindi variations)
    this.navigationCommands = {
      // Home navigation
      'home': '/',
      'go home': '/',
      'go to home': '/',
      'main page': '/',
      'ghar': '/',
      'home page': '/',
      'होम': '/',
      'घर': '/',
      
      // Map
      'map': '/map',
      'show map': '/map',
      'go to map': '/map',
      'navigate': '/map',
      'navigation': '/map',
      'naksha': '/map',
      'mandir dekho': '/map',
      'temple map': '/map',
      'मैप': '/map',
      'नक्शा': '/map',
      
      // Family tracker
      'family tracker': '/family-tracker',
      'track family': '/family-tracker',
      'go to family tracker': '/family-tracker',
      'family members': '/family-tracker',
      'locate family': '/family-tracker',
      'family': '/family-tracker',
      'parivar': '/family-tracker',
      'फैमिली ट्रैकर': '/family-tracker',
      'परिवार': '/family-tracker',
      'परिवार ट्रैकर': '/family-tracker',
      
      // Itinerary
      'itinerary': '/itineraryai',
      'chatbot': '/itineraryai',
      'plan journey': '/itineraryai',
      'go to itinerary': '/itineraryai',
      'trip planner': '/itineraryai',
      'schedule': '/itineraryai',
      'yatra plan': '/itineraryai',
      'plan yatra': '/itineraryai',
      'यात्रा': '/itineraryai',
      
      // Profile
      'profile': '/profile',
      'my account': '/profile',
      'go to profile': '/profile',
      'my profile': '/profile',
      'settings': '/profile',
      'प्रोफाइल': '/profile',
      
      // Sign in/out
      'sign in': '/signin',
      'login': '/signin',
      'sign up': '/signup',
      'register': '/signup',
      'log out': '/signout',
      'logout': '/signout'
    };
  }

  // Convert speech to text using Sarvam AI via backend proxy
  async transcribeAudio(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-command.webm');
      
      const response = await fetch(`${this.baseURL}/api/voice/transcribe`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Speech-to-text failed: ${response.status}`);
      }

      const data = await response.json();
      return data.transcript;
    } catch (error) {
      console.error('Voice transcription error:', error);
      throw error;
    }
  }

  // Start voice recording
  async startListening() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];
      this.isListening = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      console.log('Voice recording started');
      return true;
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      throw new Error('Microphone access denied. Please allow microphone permission.');
    }
  }

  // Stop recording and process command
  async stopListening() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isListening) {
        reject(new Error('Not currently listening'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          
          console.log('Processing voice command...');
          const transcript = await this.transcribeAudio(audioBlob);
          console.log('Transcript received:', transcript);
          
          const navigationResult = this.processNavigationCommand(transcript);
          console.log('Navigation result:', navigationResult);
          
          this.isListening = false;
          this.cleanup();
          
          resolve({
            transcript,
            ...navigationResult
          });
        } catch (error) {
          this.cleanup();
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  // Process voice command for navigation
  processNavigationCommand(transcript) {
    const command = transcript.toLowerCase().trim();
    
    // Remove common prefixes
    const cleanedCommand = command
      .replace(/^(go to|goto|show|open|navigate to|take me to)\s+/i, '')
      .replace(/\s+page$/i, '')
      .replace(/।$/, '') // Remove Hindi period
      .trim();
    
    console.log('Original command:', command);
    console.log('Cleaned command:', cleanedCommand);
    
    // Direct command match
    if (this.navigationCommands[command]) {
      return {
        route: this.navigationCommands[command],
        command: command,
        confidence: 'high'
      };
    }

    // Try cleaned command
    if (this.navigationCommands[cleanedCommand]) {
      return {
        route: this.navigationCommands[cleanedCommand],
        command: cleanedCommand,
        confidence: 'high'
      };
    }

    // Fuzzy matching for partial commands
    const bestMatch = this.findBestMatch(cleanedCommand);
    if (bestMatch) {
      return {
        route: bestMatch.route,
        command: bestMatch.command,
        confidence: bestMatch.confidence
      };
    }

    return {
      route: null,
      command: command,
      confidence: 'none',
      suggestions: this.getSuggestions(cleanedCommand)
    };
  }

  // Find best matching command
  findBestMatch(input) {
    let bestMatch = null;
    let highestScore = 0;

    Object.keys(this.navigationCommands).forEach(command => {
      const score = this.calculateSimilarity(input, command);
      if (score > highestScore && score > 0.4) { // Lowered threshold from 0.5 to 0.4
        highestScore = score;
        bestMatch = {
          route: this.navigationCommands[command],
          command: command,
          confidence: score > 0.7 ? 'high' : 'medium'
        };
      }
    });

    return bestMatch;
  }

  // Simple similarity calculation
  calculateSimilarity(str1, str2) {
    // Check if one string contains the other
    if (str1.includes(str2) || str2.includes(str1)) {
      return 0.8;
    }

    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    let matches = 0;

    words1.forEach(word1 => {
      words2.forEach(word2 => {
        if (word1.includes(word2) || word2.includes(word1)) {
          matches++;
        }
      });
    });

    return matches / Math.max(words1.length, words2.length);
  }

  // Get command suggestions
  getSuggestions(input) {
    const suggestions = [];
    
    Object.keys(this.navigationCommands).forEach(command => {
      // Only suggest English commands for clarity
      if (command.includes(input) || input.includes(command) || 
          (!command.match(/[\u0900-\u097F]/) && suggestions.length < 3)) {
        if (!suggestions.includes(command) && !command.match(/[\u0900-\u097F]/)) {
          suggestions.push(command);
        }
      }
    });

    return suggestions.slice(0, 5);
  }

  // Cleanup resources
  cleanup() {
    if (this.mediaRecorder && this.mediaRecorder.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    this.audioChunks = [];
  }
}

export default new VoiceNavigationService();
