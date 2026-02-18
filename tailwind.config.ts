import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#070b14",
        surface: "#101829",
        "surface-muted": "#162239",
        border: "#243452",
        text: "#e6eefc",
        muted: "#99abc9",
        accent: "#7c9bff",
        success: "#1ecb88",
        danger: "#f36b7f",
        warning: "#f0b24d",
        primary: "#3ec7ff",
      },
      fontFamily: {
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 24px 65px rgba(5, 12, 25, 0.55)",
      },
    },
  },
  plugins: [],
};

export default config;
