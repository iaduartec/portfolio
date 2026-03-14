import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at top left, rgba(62,199,255,0.32), rgba(7,11,20,1) 58%), linear-gradient(135deg, #101829, #070b14)",
          color: "#e6eefc",
          display: "flex",
          fontSize: 28,
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.06em",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(62,199,255,0.35)",
            borderRadius: 18,
            boxShadow: "0 0 28px rgba(62,199,255,0.2)",
            display: "flex",
            padding: "10px 12px",
          }}
        >
          <span style={{ color: "#ffffff" }}>M</span>
          <span style={{ color: "#3ec7ff" }}>V</span>
        </div>
      </div>
    ),
    size
  );
}
