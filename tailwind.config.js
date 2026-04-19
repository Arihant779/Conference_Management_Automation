/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,mjs}",
    "./api/**/*.mjs",
    "./server/**/*.mjs"
  ],
  theme: {
    extend: {
      colors: {
        // Prism Template (Creative)
        'p-primary': '#8b5cf6',
        'p-secondary': '#ec4899',
        'p-accent': '#06b6d4',
        // Elite Template (Business/Executive)
        'e-navy': '#01050e',
        'e-surface': '#08101f',
        'e-platinum': '#f8fafc',
        'e-accent': '#3b82f6',
        'e-slate': '#94a3b8',
      },
      animation: {
        'in': 'fadeIn 0.3s ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
