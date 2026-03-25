"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpenText, ExternalLink, Link2 } from "lucide-react";
import Image from "next/image";
import { buildShareUrl } from "@/libs/share";

type TopBarProps = {
  state: unknown;
};

type ShareStatus = {
  tone: "success" | "error";
  message: string;
};

const STATUS_CLEAR_MS = 2500;

export default function TopBar({ state }: TopBarProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  const showStatus = (nextStatus: ShareStatus) => {
    setStatus(nextStatus);
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = window.setTimeout(() => {
      setStatus(null);
      statusTimerRef.current = null;
    }, STATUS_CLEAR_MS);
  };

  const copyViaClipboardApi = async (value: string) => {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(value);
    return true;
  };

  const copyViaTextarea = (value: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.readOnly = true;
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    } finally {
      document.body.removeChild(textarea);
    }
    return copied;
  };

  const onShare = async () => {
    if (isSharing) return;

    const url = buildShareUrl(state, window.location.origin);
    if (!url) {
      showStatus({
        tone: "error",
        message: "Unable to generate a share link from the current state.",
      });
      return;
    }

    setIsSharing(true);
    try {
      const copied = await copyViaClipboardApi(url);
      if (!copied && !copyViaTextarea(url)) {
        throw new Error("Unable to copy share link.");
      }

      showStatus({
        tone: "success",
        message: "Share link copied to clipboard.",
      });
    } catch {
      showStatus({
        tone: "error",
        message: "Could not copy automatically. The share link is ready to use.",
      });
    } finally {
      setIsSharing(false);
    }
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

      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShare}
            disabled={isSharing}
            aria-busy={isSharing}
            className="
              inline-flex items-center gap-1.5
              rounded-xl px-3 py-2 text-sm font-semibold
              text-white shadow-sm ring-1 ring-inset ring-slate-900/5
              bg-indigo-600 hover:bg-indigo-500 active:translate-y-[1px]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
              disabled:cursor-not-allowed disabled:opacity-70
              dark:bg-indigo-500 dark:hover:bg-indigo-400
              transition
            "
          >
            <Link2 className="size-4" aria-hidden />
            <span>{isSharing ? "Sharing..." : "Share Link"}</span>
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

        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={[
            "min-h-4 text-[11px] leading-tight",
            status?.tone === "error" ? "text-rose-600" : "text-slate-500",
          ].join(" ")}
        >
          {status?.message ?? " "}
        </p>
      </div>
    </div>
  );
}
