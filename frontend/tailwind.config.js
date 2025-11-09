/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0e27',
          surface: '#151933',
          border: '#1e2442',
          text: '#e0e7ff',
          muted: '#6b7396',
          accent: '#00ffff',
          accentDim: '#008b8b',
          critical: '#ff003c',
          warning: '#ffaa00',
          success: '#00ff88',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
        display: ['"Rubik"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 255, 255, 0.3)',
        'glow-sm': '0 0 10px rgba(0, 255, 255, 0.2)',
        'glow-critical': '0 0 20px rgba(255, 0, 60, 0.4)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
          },
          '50%': {
            opacity: '0.8',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)'
          },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.95' },
        },
      },
    },
  },
  plugins: [],
}
