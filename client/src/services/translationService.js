// services/translationService.js
class TranslationService {
  constructor() {
    this.baseURL = '/api/translate';
    this.cache = new Map();
    this.requestQueue = [];
    this.pendingRequests = new Map(); // Track pending requests
    this.isProcessing = false;
    this.requestDelay = 100; // Delay between requests (ms) - optimized for progressive updates
    this.maxRetries = 2; // Reduced retries
    this.storageKey = 'translation_cache';
    
    // Load cache from sessionStorage on initialization
    this.loadCacheFromStorage();
  }

  // Load cache from sessionStorage
  loadCacheFromStorage() {
    try {
      const stored = sessionStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = new Map(Object.entries(parsed));
        console.log(`[TranslationService] Loaded ${this.cache.size} cached translations from storage`);
      }
    } catch (error) {
      console.error('[TranslationService] Failed to load cache from storage:', error);
    }
  }

  // Save cache to sessionStorage
  saveCacheToStorage() {
    try {
      const cacheObj = Object.fromEntries(this.cache);
      sessionStorage.setItem(this.storageKey, JSON.stringify(cacheObj));
    } catch (error) {
      console.error('[TranslationService] Failed to save cache to storage:', error);
    }
  }

  async translateText(text, targetLanguage, sourceLanguage = 'en-IN') {
    // Handle empty or very short text
    if (!text || text.trim().length === 0) {
      return text;
    }

    // If text is too long, chunk it
    const MAX_CHARS = 900; // Leave buffer below 1000 char limit (Sarvam mayura:v1)
    if (text.length > MAX_CHARS) {
      return this.translateLongText(text, targetLanguage, sourceLanguage);
    }

    const cacheKey = `${text}_${sourceLanguage}_${targetLanguage}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Check if this exact request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create promise for this request
    const promise = new Promise((resolve) => {
      // Check if already in queue
      const existingIndex = this.requestQueue.findIndex(
        req => req.cacheKey === cacheKey
      );
      
      if (existingIndex === -1) {
        // Only add to queue if not already present
        this.requestQueue.push({
          text,
          targetLanguage,
          sourceLanguage,
          cacheKey,
          resolve,
          retries: 0
        });
        
        // Start processing
        this.processQueue();
      } else {
        // If already in queue, add another resolver
        this.requestQueue[existingIndex].additionalResolvers = 
          this.requestQueue[existingIndex].additionalResolvers || [];
        this.requestQueue[existingIndex].additionalResolvers.push(resolve);
      }
    });

    // Store pending promise
    this.pendingRequests.set(cacheKey, promise);
    
    return promise;
  }

  // Handle text longer than 2000 characters by chunking
  async translateLongText(text, targetLanguage, sourceLanguage = 'en-IN') {
    const MAX_CHARS = 900; // Sarvam mayura:v1 has 1000 char limit
    const chunks = [];
    
    // Try to split on sentence boundaries first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= MAX_CHARS) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        // If single sentence is too long, split it by words
        if (sentence.length > MAX_CHARS) {
          const words = sentence.split(' ');
          let wordChunk = '';
          for (const word of words) {
            if ((wordChunk + ' ' + word).length <= MAX_CHARS) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) chunks.push(wordChunk);
              wordChunk = word;
            }
          }
          if (wordChunk) chunks.push(wordChunk);
          currentChunk = '';
        } else {
          currentChunk = sentence;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    console.log(`[TranslationService] Chunking long text into ${chunks.length} parts`);

    // Translate each chunk
    const translatedChunks = await Promise.all(
      chunks.map(chunk => this.translateText(chunk, targetLanguage, sourceLanguage))
    );

    return translatedChunks.join('');
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`[TranslationService] Starting queue processing. Queue length: ${this.requestQueue.length}`);

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      // Skip if already cached (might have been fetched by another request)
      if (this.cache.has(request.cacheKey)) {
        request.resolve(this.cache.get(request.cacheKey));
        // Resolve any additional resolvers
        if (request.additionalResolvers) {
          request.additionalResolvers.forEach(resolve => resolve(this.cache.get(request.cacheKey)));
        }
        this.pendingRequests.delete(request.cacheKey);
        continue;
      }
      
      try {
        const translatedText = await this.makeRequest(
          request.text,
          request.targetLanguage,
          request.sourceLanguage
        );
        
        // Cache the result
        this.cache.set(request.cacheKey, translatedText);
        this.saveCacheToStorage(); // Persist to sessionStorage
        
        request.resolve(translatedText);
        // Resolve any additional resolvers
        if (request.additionalResolvers) {
          request.additionalResolvers.forEach(resolve => resolve(translatedText));
        }
        this.pendingRequests.delete(request.cacheKey);
        
        // Delay before next request to avoid rate limiting
        if (this.requestQueue.length > 0) {
          await this.sleep(this.requestDelay);
        }
      } catch (error) {
        console.error('Translation request failed:', error);
        
        // Retry logic for rate limit errors
        if (error.status === 429 && request.retries < this.maxRetries) {
          request.retries++;
          const retryDelay = 2000 * Math.pow(2, request.retries); // Exponential backoff
          console.log(`Retrying in ${retryDelay}ms... (attempt ${request.retries}/${this.maxRetries})`);
          
          await this.sleep(retryDelay);
          this.requestQueue.unshift(request); // Add back to front of queue
        } else {
          // Max retries reached or other error, return original text
          console.warn(`Translation failed after ${request.retries} retries, using original text`);
          request.resolve(request.text);
          // Resolve any additional resolvers with original text
          if (request.additionalResolvers) {
            request.additionalResolvers.forEach(resolve => resolve(request.text));
          }
          this.pendingRequests.delete(request.cacheKey);
        }
      }
    }

    this.isProcessing = false;
    console.log(`[TranslationService] Queue processing complete. Remaining in queue: ${this.requestQueue.length}`);
  }

  async makeRequest(text, targetLanguage, sourceLanguage) {
    console.log(`[Translation] Translating: "${text.substring(0, 50)}..." (${text.length} chars) to ${targetLanguage}`);
    
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        source_language_code: sourceLanguage,
        target_language_code: targetLanguage
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      console.error('[Translation] Sarvam API error:', response.status, data);
      const error = new Error(data.message || 'Translation service error');
      error.status = response.status;
      throw error;
    }
    
    return data.translated_text;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async translateMultiple(textArray, targetLanguage, sourceLanguage = 'en-IN') {
    const promises = textArray.map(text => 
      this.translateText(text, targetLanguage, sourceLanguage)
    );
    return Promise.all(promises);
  }

  // Clear cache if needed
  clearCache() {
    this.cache.clear();
    sessionStorage.removeItem(this.storageKey);
    console.log('Translation cache cleared from memory and storage');
  }

  // Get queue status for debugging
  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      pendingRequests: this.pendingRequests.size,
      cacheSize: this.cache.size,
      isProcessing: this.isProcessing
    };
  }

  // Translate dynamic content (for Mappls API results)
  async translateDynamic(text, targetLanguage, sourceLanguage = 'en-IN') {
    if (!text || targetLanguage === 'en-IN') {
      return text;
    }
    return this.translateText(text, targetLanguage, sourceLanguage);
  }

  // Batch translate multiple texts efficiently
  async translateBatch(textArray, targetLanguage, sourceLanguage = 'en-IN') {
    if (targetLanguage === 'en-IN') {
      return textArray;
    }
    
    const promises = textArray.map(text => 
      this.translateText(text, targetLanguage, sourceLanguage)
    );
    return Promise.all(promises);
  }
}

export default new TranslationService();
