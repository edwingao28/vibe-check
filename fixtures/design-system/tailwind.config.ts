import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary-50": "#f0fdf4",
        "primary-100": "#dcfce7",
        "primary-200": "#bbf7d0",
        "primary-300": "#86efac",
        "primary-400": "#4ade80",
        "primary-500": "#22c55e",
        "primary-600": "#16a34a",
        "primary-700": "#15803d",
        "primary-800": "#166534",
        "primary-900": "#14532d",
        "secondary-50": "#eff6ff",
        "secondary-500": "#3b82f6",
        "secondary-700": "#1d4ed8",
        "accent-amber": "#f59e0b",
        "accent-rose": "#f43f5e",
        "accent-teal": "#14b8a6",
      },
      fontFamily: {
        "heading": ["'DM Sans'", "system-ui", "sans-serif"],
        "body": ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        "mono": ["'JetBrains Mono'", "monospace"],
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
        "34": "8.5rem",
      },
      borderRadius: {
        "xs": "0.125rem",
        "sm": "0.25rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
      },
      boxShadow: {
        "card": "0 1px 3px 0 rgb(0 0 0 / 0.08)",
        "elevated": "0 4px 12px 0 rgb(0 0 0 / 0.08)",
        "modal": "0 8px 30px 0 rgb(0 0 0 / 0.12)",
      },
      fontSize: {
        "xs": ["0.75rem", { lineHeight: "1rem" }],
        "sm": ["0.875rem", { lineHeight: "1.25rem" }],
        "base": ["1rem", { lineHeight: "1.5rem" }],
        "lg": ["1.125rem", { lineHeight: "1.75rem" }],
        "xl": ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
    },
  },
  plugins: [],
};

export default config;
