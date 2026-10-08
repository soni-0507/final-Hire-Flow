/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: { float: 'float 7s ease-in-out infinite' },
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff4ff',
          100: '#dbe6ff',
          200: '#bcd0ff',
          400: '#6b94f5',
          500: '#2f66e8',
          600: '#2455c9',
          700: '#1f46a3',
        },
        canvas: { DEFAULT: '#f4f4f1', dark: '#111318' },
        surface: { DEFAULT: '#ffffff', dark: '#1a1d24' },
      },
    },
  },
  plugins: [],
};
