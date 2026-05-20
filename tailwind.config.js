/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mickii: {
          bg: '#02040A',
          navy: '#070B16',
          navy2: '#0B1220',
          gold: '#FFB703',
          softGold: '#FFE08A',
          cyan: '#0F766E',
          cyanBright: '#2DD4BF',
          violet: '#4338CA',
          violetBright: '#818CF8',
          success: '#00D4AA',
          danger: '#FF6B6B',
          text: '#F8FAFC',
          muted: '#CBD5E1',
          mutedLow: '#94A3B8'
        }
      }
    }
  },
  plugins: []
}