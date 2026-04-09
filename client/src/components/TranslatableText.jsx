import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/TranslationContext';

const TranslatableText = ({ 
  textKey, 
  children, 
  className = '',
  tag: Tag = 'span' 
}) => {
  const { translateContent, currentLanguage } = useTranslation();
  const [translatedText, setTranslatedText] = useState(children);
  const [isTranslating, setIsTranslating] = useState(false);
  const lastTranslatedLang = useRef('en-IN');
  const isTranslatingRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate translation requests
    if (isTranslatingRef.current || lastTranslatedLang.current === currentLanguage) {
      return;
    }

    const performTranslation = async () => {
      if (currentLanguage === 'en-IN') {
        setTranslatedText(children);
        setIsTranslating(false);
        lastTranslatedLang.current = 'en-IN';
        return;
      }

      isTranslatingRef.current = true;
      setIsTranslating(true);
      
      try {
        const translated = await translateContent(textKey, children);
        setTranslatedText(translated);
        lastTranslatedLang.current = currentLanguage;
      } catch (error) {
        console.error('Translation failed:', error);
        setTranslatedText(children);
      } finally {
        setIsTranslating(false);
        isTranslatingRef.current = false;
      }
    };

    performTranslation();
  }, [currentLanguage, textKey, children, translateContent]);

  return (
    <Tag className={`${className} ${isTranslating ? 'opacity-70 transition-opacity duration-300' : ''}`}>
      {translatedText}
    </Tag>
  );
};

export default TranslatableText;
