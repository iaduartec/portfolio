export const palette = {
  background: "#131722",
  surface: "#1b1f2a",
  surfaceMuted: "#1e222d",
  border: "#2a2e39",
  text: "#d1d4dc",
  muted: "#7f8596",
  green: "#00c074",
  red: "#f6465d",
  amber: "#f5a524",
  accent: "#2962ff",
};

export const getPnlTone = (value: number) => (value >= 0 ? "success" : "danger");
