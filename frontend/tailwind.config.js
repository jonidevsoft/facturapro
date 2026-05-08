/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0c10',
        surface: '#111318',
        surface2: '#181c24',
        border: '#1e2330',
        accent: '#00e5a0',
        accent2: '#0077ff',
        warn: '#ff6b35',
        danger: '#ff4757',
        muted: '#5a6075',
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
