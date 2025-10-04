"use client";
import Image from "next/image";
import { encodeShareState } from "@/libs/share";

export default function TopBar({ state }: { state: any }) {
  const onShare = () => {
    const b64 = encodeShareState(state);
    const url = `${location.origin}?s=${encodeURIComponent(b64)}`;
    navigator.clipboard.writeText(url);
    alert("공유 링크가 복사되었습니다.");
  };

  return (
    <div
      className="card"
      style={{
        padding: 12,
        marginBottom: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <Image
          src="/favicon.svg"
          alt="Mermaid Sky Exporter"
          width={20}
          height={20}
          priority
        />
        Mermaid Sky Exporter
      </div>

      <div className="toolbar">
        <button type="button" className="btn" onClick={onShare}>
          Share Link
        </button>
        <a
          className="btn"
          href="https://mermaid.js.org/"
          target="_blank"
          rel="noreferrer"
        >
          Mermaid Docs
        </a>
      </div>
    </div>
  );
}
