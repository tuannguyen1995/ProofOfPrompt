/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F5F0',
        card: '#FFFFFF',
        linen: {
          50: '#FAF9F6',
          100: '#F4F2EB',
          200: '#E8E5DA',
          300: '#E2DED4',
          400: '#D1CBC0',
          500: '#B8B0A2',
        },
        ultramarine: {
          DEFAULT: '#1D4ED8',
          hover: '#1E40AF',
          light: '#EFF6FF',
          border: '#BFDBFE',
        },
        crimson: {
          DEFAULT: '#BE123C',
          hover: '#9F1239',
          light: '#FFF1F2',
          border: '#FECDD3',
        },
        amber: {
          DEFAULT: '#D97706',
          hover: '#B45309',
          light: '#FFFBEB',
          border: '#FDE68A',
        },
        ink: {
          900: '#1C1917',
          700: '#44403C',
          500: '#78716C',
          400: '#A8A29E',
        }
      },
      fontFamily: {
        display: ['"Syne"', '"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'gallery': '0 4px 20px -2px rgba(28, 25, 23, 0.06)',
        'elevated': '0 10px 30px -4px rgba(28, 25, 23, 0.08)',
      }
    },
  },
  plugins: [],
}
