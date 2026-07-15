/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#243B4A',
        'primary-dark': '#1B2E3A',
        navy: '#243B4A',
        'navy-deep': '#1B2E3A',
        gold: '#C9A24B',
        'gold-deep': '#A9823A',
        cream: '#EDE7DD',
        paper: '#F4F1EA',
        muted: '#9BB0BC',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#C9A24B',
        info: '#3B82F6',
        background: '#F4F1EA',
        surface: '#FFFFFF',
        border: '#D8D0C3',
        text: '#1B2E3A',
        'text-muted': '#5F7380'
      },
      fontFamily: {
        heading: ['Marcellus', 'Georgia', 'serif'],
        sans: ['Jost', 'Segoe UI', 'system-ui', 'sans-serif']
      },
      // Brand Guidelines Edition 01 §04 — Typography.
      // Taglines and micro-labels: uppercase at 0.28–0.30em. Marcellus caps headings: 0.10–0.20em.
      // Tailwind's own scale tops out at 0.1em (tracking-widest), which is far tighter than brand.
      letterSpacing: {
        eyebrow: '0.28em',
        display: '0.15em'
      },
      // §04 — body copy line-height ~1.7
      lineHeight: {
        body: '1.7'
      }
    }
  },
  plugins: []
}
