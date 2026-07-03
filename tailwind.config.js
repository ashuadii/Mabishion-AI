/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        'primary-dark': '#4F46E5',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        background: '#0F172A',
        surface: '#1E293B',
        border: '#334155',
        text: '#F8FAFC',
        'text-muted': '#94A3B8'
      }
    }
  },
  plugins: []
}