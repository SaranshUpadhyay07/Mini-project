import React from 'react';
import { useTranslation } from '../context/TranslationContext';

const LanguageSelector = () => {
  const { currentLanguage, supportedLanguages, changeLanguage, isLoading } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <select 
        value={currentLanguage} 
        onChange={(e) => changeLanguage(e.target.value)}
        disabled={isLoading}
        className="px-4 py-2 border border-primary-300 rounded-xl text-gray-700 bg-white hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {supportedLanguages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
      {isLoading && (
        <div className="flex items-center gap-2 text-primary text-sm">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Translating...</span>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
