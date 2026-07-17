/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#030B14',
        surface: '#071524',
        card:    '#091827',
        cyan:    '#00E5FF',
        green:   '#00FF88',
        amber:   '#FFB800',
        red:     '#FF4455',
        purple:  '#9B7AFF',
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        ui:      ['Rajdhani', 'sans-serif'],
        mono:    ['Share Tech Mono', 'monospace'],
      },
      boxShadow: {
        cyan:   '0 0 24px rgba(0,229,255,0.25)',
        green:  '0 0 24px rgba(0,255,136,0.25)',
        glow:   '0 0 48px rgba(0,229,255,0.12)',
      },
      animation: {
        'pulse-cyan': 'pulse-cyan 2s ease-in-out infinite',
        'glow-text':  'glow-text 3s ease-in-out infinite',
        'scan':       'scan 4s linear infinite',
      },
      keyframes: {
        'pulse-cyan': {
          '0%,100%': { boxShadow: '0 0 8px rgba(0,229,255,0.3)' },
          '50%':      { boxShadow: '0 0 24px rgba(0,229,255,0.7)' },
        },
        'glow-text': {
          '0%,100%': { textShadow: '0 0 20px rgba(0,229,255,0.4)' },
          '50%':     { textShadow: '0 0 40px rgba(0,229,255,0.8)' },
        },
        'scan': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};
