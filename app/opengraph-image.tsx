import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const { width, height } = size;
  const title = "TrackNote - 音楽練習の見える化ツール";
  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "row",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
          background: "#ffffff",
          color: "#0f172a",
        }}
      >
        {/* Left: logo panel */}
        <div
          style={{
            width: 360,
            height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            borderRight: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 28,
              background: "#0ea5e9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 64,
              fontWeight: 900,
              letterSpacing: -1,
              boxShadow: "0 8px 24px rgba(14,165,233,0.35)",
            }}
          >
            TN
          </div>
        </div>
        {/* Right: title and subtitle */}
        <div
          style={{
            flex: 1,
            height,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 64px",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 60, fontWeight: 900, letterSpacing: -1 }}>{title}</div>
          <div style={{ fontSize: 26, color: "#334155" }}>
            音楽練習を“見える化”するトレーニングアプリ。<br />
            コピー練習からコード・音程・アドリブの基礎までサポート
          </div>
        </div>
      </div>
    ),
    { width, height }
  );
}
