"use client";

import { BookOpenText, ExternalLink, Link2 } from "lucide-react";
import Image from "next/image";
import { encodeShareState } from "@/libs/share";

type TopBarProps = {
  state: unknown;
};

export default function TopBar({ state }: TopBarProps) {
  const onShare = () => {
    const b64 = encodeShareState(state);
    const url = `${location.origin}?s=${encodeURIComponent(b64)}`;
    navigator.clipboard.writeText(url);
    alert("공유 링크가 복사되었습니다.");
  };

  return (
    <div
      role="toolbar"
      className="
        sticky top-0 z-30
        flex items-center justify-between gap-3
        rounded-2xl border px-4 py-3 shadow-sm backdrop-blur
        bg-white/70 border-slate-200
        dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100
      "
    >
      {/* 좌측: 로고 + 타이틀 */}
      <div className="flex items-center gap-2 font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
        <Image
          src="/favicon.svg"
          alt="Mermaid Sky Exporter"
          width={20}
          height={20}
          priority
          className="shrink-0"
        />
        <span className="text-sm sm:text-base">Mermaid Sky Exporter</span>
      </div>

      {/* 우측: 툴바 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onShare}
          className="
            inline-flex items-center gap-1.5
            rounded-xl px-3 py-2 text-sm font-semibold
            text-white shadow-sm ring-1 ring-inset ring-slate-900/5
            bg-indigo-600 hover:bg-indigo-500 active:translate-y-[1px]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
            dark:bg-indigo-500 dark:hover:bg-indigo-400
            transition
          "
        >
          <Link2 className="size-4" aria-hidden />
          <span>Share Link</span>
        </button>

        <a
          href="https://mermaid.js.org/"
          target="_blank"
          rel="noreferrer"
          className="
            inline-flex items-center gap-1.5
            rounded-xl px-3 py-2 text-sm font-semibold
            border border-slate-200 bg-white/70 text-slate-700
            hover:bg-slate-50 active:translate-y-[1px]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300
            dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100
            dark:hover:bg-slate-800
            transition
          "
        >
          <BookOpenText className="size-4" aria-hidden />
          <span className="whitespace-nowrap">Mermaid Docs</span>
          <ExternalLink className="size-3.5 opacity-70" aria-hidden />
        </a>
      </div>
    </div>
  );
}
