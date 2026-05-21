import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        background: "#000",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", letterSpacing: "0.15em" }}>VIBE TOOLS</h1>
      <Link
        href="/vibe-tools/index.html"
        style={{
          padding: "12px 24px",
          background: "#ff6644",
          color: "#000",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        도구 열기 →
      </Link>
      <p style={{ fontSize: "0.85rem", opacity: 0.5 }}>
        포트 3010 · Remotion(3000)과 분리됨
      </p>
    </main>
  );
}
