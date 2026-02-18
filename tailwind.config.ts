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
        background: "#09060f",
        surface: "#120d1f",
        "surface-muted": "#1a1330",
        border: "#3c2d5f",
        text: "#f8f4ff",
        muted: "#c9b4ea",
        accent: "#ff4fd8",
        success: "#35ff9f",
        danger: "#ff4f6d",
        warning: "#ffd447",
        primary: "#49e7ff",
      },
      fontFamily: {
        sans: ["var(--font-vt323)", "ui-monospace", "monospace"],
        display: ["var(--font-press-start)", "ui-monospace", "monospace"],
        pixel: ["var(--font-press-start)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 8px 0 rgba(73, 231, 255, 0.3), 0 24px 45px rgba(0, 0, 0, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
