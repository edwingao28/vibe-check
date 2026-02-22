/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-50": "#f0f9f4",
        "brand-100": "#d1fae5",
        "brand-200": "#a7f3d0",
        "brand-500": "#10b981",
        "brand-800": "#065f46",
        "brand-900": "#064e3b",
        "accent": "#0ea5e9",
        "accent-light": "#bae6fd",
      },
      fontFamily: {
        "sans": ["Inter", "system-ui", "sans-serif"],
        "serif": ["Playfair Display", "Georgia", "serif"],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
      },
      borderRadius: {
        "sm": "0.125rem",
        "md": "0.375rem",
      },
    },
  },
  plugins: [],
};
