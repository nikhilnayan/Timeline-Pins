/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        moss: {
          950: '#1d2314',
          900: '#28301c',
          800: '#323d25',
          700: '#414f31',
          600: '#556642',
        },
        brass: {
          300: '#c7ae6b',
          400: '#b39752',
          500: '#9a7e3b',
          600: '#7f662d',
          700: '#634f21',
        },
        parchment: {
          50: '#f7f5ec',
          100: '#eeebd9',
          200: '#d2cf9a',
          300: '#bcb87e',
          400: '#a39f64',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        atlas: '0 10px 30px -8px rgba(40, 48, 28, 0.22)',
        'atlas-dark': '0 14px 36px -8px rgba(10, 14, 6, 0.65)',
      },
    },
  },
  plugins: [],
};
