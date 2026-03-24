/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        accent: {
          cyan: 'rgb(var(--accent-cyan) / <alpha-value>)',
          pink: 'rgb(var(--accent-pink) / <alpha-value>)',
          orange: 'rgb(var(--accent-orange) / <alpha-value>)',
          green: 'rgb(var(--accent-green) / <alpha-value>)',
          yellow: 'rgb(var(--accent-yellow) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'glow': '0 0 20px rgb(var(--primary) / 0.3)',
        'glow-cyan': '0 0 20px rgb(var(--accent-cyan) / 0.3)',
        'glow-pink': '0 0 20px rgb(var(--accent-pink) / 0.3)',
      },
    },
  },
  plugins: [],
}
