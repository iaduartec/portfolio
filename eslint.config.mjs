import js from "@eslint/js";
import next from "eslint-config-next";

export default [
  js.configs.recommended,
  ...next,
  {
    ignores: [
      "**/*.config.*",
      "venv/**",
      ".venv/**",
      "node_modules/**",
      "ai_portfolio_system/**",
      "database/**",
      "__pycache__/**",
      "**/*.py",
      "tests/**",
      "config/**",
      "docs/**",
    ],
    rules: {
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
