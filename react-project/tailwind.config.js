/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  safelist: [
    // Clases de colores para las barras de progreso del dashboard
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-red-500',
    'bg-amber-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-gray-500',
    // Clases de texto para estados
    'text-yellow-600',
    'text-green-600',
    'text-red-600',
    'text-blue-600',
    'text-purple-600',
    // Clases de fondo para estados
    'bg-yellow-100',
    'bg-green-100',
    'bg-red-100',
    'bg-blue-100',
    'bg-purple-100',
    // Versiones dark
    'dark:bg-yellow-800',
    'dark:bg-green-800',
    'dark:bg-red-800',
    'dark:bg-blue-800',
    'dark:bg-purple-800',
    'dark:text-yellow-100',
    'dark:text-green-100',
    'dark:text-red-100',
    'dark:text-blue-100',
    'dark:text-purple-100'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A8A',
          light: '#2563EB',
          dark: '#1e293b',
        },
        secondary: {
          DEFAULT: '#DC2626',
          light: '#EF4444',
          dark: '#334155',
        },
        accent: {
          DEFAULT: '#66c2a5',
          light: '#99d8c9',
          dark: '#41ae76',
        },
        success: '#2e7d32',
        warning: '#ed6c02',
        error: '#d32f2f',
        gray: {
          100: '#f8f9fa',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#6c757d',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};