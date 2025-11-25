import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const { width, height } = size;
  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: 64,
          background: "linear-gradient(135deg, #10b981 0%, #065f46 100%)",
          color: "#fff",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 12,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#065f46",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            TN
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -1 }}>TrackNote</div>
        </div>
        <div style={{ marginTop: 24, fontSize: 28, opacity: 0.95 }}>
          YouTube の演奏動画で練習進捗を記録・管理
        </div>
      </div>
    ),
    { width, height }
  );
}

