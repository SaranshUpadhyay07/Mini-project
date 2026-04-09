import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import translationService from '../services/translationService';

const TranslationContext = createContext();

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};

export const TranslationProvider = ({ children }) => {
  // Restore language from sessionStorage on mount
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const stored = sessionStorage.getItem('current_language');
    return stored || 'en-IN';
  });
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTranslations, setPendingTranslations] = useState(0);

  // Save language to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('current_language', currentLanguage);
  }, [currentLanguage]);

  // Supported languages for your pilgrim site
  const supportedLanguages = useMemo(() => [
    { code: 'en-IN', name: 'English' },
    { code: 'hi-IN', name: 'हिंदी' },
    { code: 'bn-IN', name: 'বাংলা' },
    { code: 'gu-IN', name: 'ગુજરાતી' },
    { code: 'mr-IN', name: 'मराठी' },
    { code: 'ta-IN', name: 'தமிழ்' },
    { code: 'te-IN', name: 'తెలుగు' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ' },
    { code: 'ml-IN', name: 'മലയാളം' },
    { code: 'pa-IN', name: 'ਪੰਜਾਬੀ' },
    { code: 'od-IN', name: 'ଓଡ଼ିଆ' }
  ], []);

  const translateContent = useCallback(async (contentKey, originalText) => {
    if (currentLanguage === 'en-IN') {
      return originalText;
    }

    const cacheKey = `${contentKey}_${currentLanguage}`;
    
    // Check if already translated (use functional update to avoid dependency)
    let cachedValue;
    setTranslations(prev => {
      cachedValue = prev[cacheKey];
      return prev;
    });
    
    if (cachedValue) {
      return cachedValue;
    }

    setPendingTranslations(prev => prev + 1);
    setIsLoading(true);
    
    try {
      const translatedText = await translationService.translateText(
        originalText, 
        currentLanguage
      );
      
      setTranslations(prev => ({
        ...prev,
        [cacheKey]: translatedText
      }));
      
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return originalText;
    } finally {
      setPendingTranslations(prev => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          setIsLoading(false);
        }
        return Math.max(0, newCount);
      });
    }
  }, [currentLanguage]);

  const changeLanguage = useCallback((languageCode) => {
    setCurrentLanguage(languageCode);
    setIsLoading(languageCode !== 'en-IN');
    setPendingTranslations(0); // Reset pending count on language change
  }, []);

  const value = useMemo(() => ({
    currentLanguage,
    supportedLanguages,
    translateContent,
    changeLanguage,
    isLoading
  }), [currentLanguage, supportedLanguages, translateContent, changeLanguage, isLoading]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};
