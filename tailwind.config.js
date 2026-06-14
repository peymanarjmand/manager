/**** Tailwind config ****/
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // New brand palette (indigo-violet).
        brand: {
          50: '#EEEDFE',
          100: '#E0DCFC',
          200: '#C7BFFA',
          300: '#A99DF6',
          400: '#8B7CFF',
          500: '#6D5EF6',
          600: '#5B4FD6',
          700: '#4B3FC4',
          800: '#3A30A0',
          900: '#2A2480',
          DEFAULT: '#6D5EF6',
        },
        // Remap the legacy "sky" accent (used across all existing screens) onto the
        // new indigo brand, so the whole app adopts the new color with no per-file
        // edits. Purely visual; can be migrated to `brand-*` gradually later.
        sky: {
          50: '#EEEDFE',
          100: '#E0DCFC',
          200: '#C7BFFA',
          300: '#A99DF6',
          400: '#8B7CFF',
          500: '#6D5EF6',
          600: '#5B4FD6',
          700: '#4B3FC4',
          800: '#3A30A0',
          900: '#2A2480',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
};
