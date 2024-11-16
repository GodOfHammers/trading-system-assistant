/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Anthropic colors
        primary: {
          DEFAULT: '#000000',
          dark: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#6B7280',
          dark: '#9CA3AF',
        },
        accent: {
          DEFAULT: '#2563EB',
          dark: '#3B82F6',
        },
        background: {
          DEFAULT: '#FFFFFF',
          dark: '#111827',
        },
        surface: {
          DEFAULT: '#F3F4F6',
          dark: '#1F2937',
        },
      },
      spacing: {
        sidebar: '300px',
      },
    },
  },
  plugins: [],
}