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
        background: "#131722",
        surface: "#1b1f2a",
        "surface-muted": "#1e222d",
        border: "#2a2e39",
        text: "#d1d4dc",
        muted: "#b1bac8",
        accent: "#2962ff",
        success: "#00c074",
        danger: "#f6465d",
        warning: "#f5a524",
      },
      boxShadow: {
        panel: "0 10px 40px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
