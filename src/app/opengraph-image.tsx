import { ImageResponse } from "next/og";

export const alt = "PunjabSkillUp — Skills for Punjab.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#111118",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: "-5px" }}>
          Punjab<span style={{ color: "#D91A2A" }}>Skill</span>Up
        </div>
        <div style={{ marginTop: 24, fontSize: 34, color: "#5A5A66" }}>
          Skills for Punjab.
        </div>
      </div>
    ),
    size,
  );
}
