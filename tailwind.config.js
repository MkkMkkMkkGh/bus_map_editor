/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#edf4f7',
        ink: '#112334',
        rail: '#dce8ee',
        accent: '#0f766e',
        amber: '#f59e0b',
      },
      boxShadow: {
        panel: '0 16px 48px rgba(17, 35, 52, 0.12)',
      },
    },
  },
  plugins: [],
}
