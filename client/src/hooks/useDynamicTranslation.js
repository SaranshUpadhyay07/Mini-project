import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import translationService from '../services/translationService';

/**
 * Hook for translating dynamic content (e.g., from API responses)
 * Unlike TranslatableText, this doesn't prevent re-renders
 * but works with dynamic data
 */
export const useDynamicTranslation = () => {
  const { currentLanguage } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);

  /**
   * Translate a single text dynamically
   * @param {string} text - Text to translate
   * @returns {Promise<string>} Translated text
   */
  const translateText = async (text) => {
    if (!text || currentLanguage === 'en-IN') {
      return text;
    }

    try {
      return await translationService.translateDynamic(text, currentLanguage);
    } catch (error) {
      console.error('Dynamic translation failed:', error);
      return text;
    }
  };

  /**
   * Translate multiple texts in batch
   * @param {string[]} texts - Array of texts to translate
   * @returns {Promise<string[]>} Array of translated texts
   */
  const translateBatch = async (texts) => {
    if (!texts || texts.length === 0 || currentLanguage === 'en-IN') {
      return texts;
    }

    setIsTranslating(true);
    try {
      return await translationService.translateBatch(texts, currentLanguage);
    } catch (error) {
      console.error('Batch translation failed:', error);
      return texts;
    } finally {
      setIsTranslating(false);
    }
  };

  /**
   * Translate an object's properties
   * @param {Object} obj - Object with text properties
   * @param {string[]} keys - Keys to translate
   * @returns {Promise<Object>} Object with translated properties
   */
  const translateObject = async (obj, keys = []) => {
    if (!obj || currentLanguage === 'en-IN') {
      return obj;
    }

    const textsToTranslate = keys.map(key => obj[key] || '');
    const translatedTexts = await translateBatch(textsToTranslate);
    
    const result = { ...obj };
    keys.forEach((key, index) => {
      if (obj[key]) {
        result[key] = translatedTexts[index];
      }
    });

    return result;
  };

  return {
    translateText,
    translateBatch,
    translateObject,
    currentLanguage,
    isTranslating
  };
};
