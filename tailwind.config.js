/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4fa',
          100: '#dce6f5',
          700: '#1e3a5f',
          800: '#162d4a',
          900: '#0f1f33',
        },
      },
    },
  },
  plugins: [],
}
