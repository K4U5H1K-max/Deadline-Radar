/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./*.js",
    "./src/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        'radar-blue': '#3B82F6',
        'radar-green': '#10B981',
        'radar-red': '#EF4444',
        'radar-orange': '#F59E0B'
      }
    },
  },
  plugins: [],
}