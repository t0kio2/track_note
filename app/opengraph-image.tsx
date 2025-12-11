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
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 26, color: "#334155" }}>
            <span>音楽練習を“見える化”するトレーニングアプリ。</span>
            <span>コピー練習からコード・音程・アドリブの基礎までサポート</span>
          </div>
        </div>
      </div>
    ),
    { width, height }
  );
}
