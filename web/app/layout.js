export const metadata = {
  title: "VIBE TOOLS",
  description: "소리 반응형 제너러티브 그래픽",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
