export const translateText = async (req, res) => {
  try {
    const { input, source_language_code, target_language_code } = req.body;

    if (!input || !target_language_code) {
      return res.status(400).json({
        success: false,
        message: 'Input text and target language are required'
      });
    }

    console.log(`[Translation] Translating: "${input.substring(0, 50)}..." to ${target_language_code}`);

    const response = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY
      },
      body: JSON.stringify({
        input,
        source_language_code: source_language_code || 'en-IN',
        target_language_code,
        speaker_gender: 'Male',
        mode: 'formal',
        model: 'mayura:v1',
        enable_preprocessing: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Translation] Sarvam API error (${response.status}):`, data);
      
      return res.status(response.status).json({
        success: false,
        message: response.status === 429 
          ? 'Rate limit exceeded. Please try again in a moment.' 
          : 'Translation service error',
        error: data
      });
    }

    console.log(`[Translation] Success: "${data.translated_text.substring(0, 50)}..."`);

    res.json({
      success: true,
      translated_text: data.translated_text
    });
  } catch (error) {
    console.error('[Translation] Internal error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during translation',
      error: error.message
    });
  }
};
