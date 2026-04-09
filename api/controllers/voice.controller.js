import axios from 'axios';
import FormData from 'form-data';

export const transcribeVoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('Transcribing voice command...');

    // Create form data for Sarvam AI
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: 'voice-command.webm',
      contentType: req.file.mimetype
    });
    formData.append('model', 'saaras:v3');
    // Use 'en-IN' for English or remove language_code for auto-detection
    // formData.append('language_code', 'hi-IN');

    // Call Sarvam AI Speech-to-Text API
    const response = await axios.post(
      'https://api.sarvam.ai/speech-to-text',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'api-subscription-key': process.env.SARVAM_API_KEY
        },
        timeout: 15000
      }
    );

    console.log('Transcription successful:', response.data);

    const transcript = response.data.transcript || '';
    console.log('Final transcript:', transcript);

    res.json({
      transcript: transcript,
      language: response.data.language_code || 'auto'
    });

  } catch (error) {
    console.error('Voice transcription error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again in a moment.' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to transcribe voice command',
      details: error.message 
    });
  }
};

