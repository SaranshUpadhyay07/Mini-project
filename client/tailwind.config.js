/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Spiritual Indigo + Sand palette
        primary: {
          DEFAULT: '#4F46E5',
          light: '#6366F1',
          dark: '#3730A3',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        sand: {
          DEFAULT: '#F5EFE6',
          light: '#FAF8F3',
          warm: '#F0E6D4',
          50: '#FDFCFA',
          100: '#FAF8F3',
          200: '#F5EFE6',
          300: '#E8DCC9',
          400: '#D4C5A9',
        },
        accent: {
          DEFAULT: '#E6B980',
          light: '#F0D4A8',
          dark: '#C9953E',
        },
        textDark: '#1F2937',
      },
    },
  },
  plugins: [],
};
