import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Mermaid Sky Exporter",
  description: "Render and export Mermaid diagrams with Next.js",
  icons: {
    icon: "/favicon.svg", // public/favicon.svg
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
