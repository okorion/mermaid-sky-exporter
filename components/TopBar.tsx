"use client";

import {
  BookOpenText,
  Download,
  ExternalLink,
  Link2,
  Share2,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildShareUrl } from "@/libs/share";
import { SITE_NAME } from "@/libs/site";

type TopBarProps = {
  state: unknown;
};

type ShareStatus = {
  tone: "success" | "error" | "info";
  message: string;
};

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const STATUS_CLEAR_MS = 2500;

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (window.navigator as NavigatorWithStandalone).standalone === true;
}

function isIosSafariBrowser() {
  if (typeof window === "undefined") return false;

  const { maxTouchPoints, platform, userAgent } = window.navigator;
  const isModernIpadOs = platform === "MacIntel" && maxTouchPoints > 1;
  const isAppleMobile = /iPad|iPhone|iPod/.test(userAgent) || isModernIpadOs;
  const isSafari =
    /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);

  return isAppleMobile && isSafari;
}

export default function TopBar({ state }: TopBarProps) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const showStatus = useCallback((nextStatus: ShareStatus) => {
    setStatus(nextStatus);
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = window.setTimeout(() => {
      setStatus(null);
      statusTimerRef.current = null;
    }, STATUS_CLEAR_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === "function");
    setIsStandalone(isStandaloneMode());
    setIsIosSafari(isIosSafariBrowser());

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const syncStandalone = () => {
      setIsStandalone(isStandaloneMode());
    };

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstallPromptEvent(null);
      setIsStandalone(true);
      showStatus({
        tone: "success",
        message: "App installed successfully.",
      });
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncStandalone);
    } else {
      mediaQuery.addListener?.(syncStandalone);
    }

    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", syncStandalone);
      } else {
        mediaQuery.removeListener?.(syncStandalone);
      }

      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [showStatus]);

  const copyViaClipboardApi = async (value: string) => {
    if (!navigator.clipboard?.writeText) return false;
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
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

  const shareViaNativeSheet = async (url: string) => {
    if (typeof navigator.share !== "function") return false;
    if (
      typeof navigator.canShare === "function" &&
      !navigator.canShare({ url })
    ) {
      return false;
    }

    try {
      await navigator.share({
        title: SITE_NAME,
        text: "Open this Mermaid diagram in Mermaid Sky Exporter.",
        url,
      });
      showStatus({
        tone: "success",
        message: "Shared successfully.",
      });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return true;
      }
      return false;
    }
  };

  const onShare = async () => {
    if (isSharing) return;

    const url = buildShareUrl(state, window.location.href);
    if (!url) {
      showStatus({
        tone: "error",
        message: "Unable to generate a share link from the current state.",
      });
      return;
    }

    setIsSharing(true);
    try {
      const shared = await shareViaNativeSheet(url);
      if (shared) return;

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
        message: "Could not share or copy the current link.",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const onInstall = async () => {
    if (!installPromptEvent || isInstalling) return;

    setIsInstalling(true);
    try {
      await installPromptEvent.prompt();
      const result = await installPromptEvent.userChoice;
      setInstallPromptEvent(null);
      showStatus({
        tone: result.outcome === "accepted" ? "success" : "info",
        message:
          result.outcome === "accepted"
            ? "Install prompt accepted."
            : "Install prompt dismissed.",
      });
    } catch {
      showStatus({
        tone: "error",
        message: "Could not open the install prompt.",
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const showInstallButton = !isStandalone && installPromptEvent !== null;
  const helperMessage =
    status?.message ??
    (!isStandalone && !showInstallButton && isIosSafari
      ? 'iPhone/iPad에서는 Safari 공유 메뉴에서 "홈 화면에 추가"를 선택하세요.'
      : " ");
  const helperTone = status?.tone ?? "info";
  const ShareIcon = canNativeShare ? Share2 : Link2;

  return (
    <div
      role="toolbar"
      className="sticky z-30 rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur"
      style={{ top: "var(--safe-top)" }}
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 font-extrabold tracking-tight text-slate-800">
          <Image
            src="/favicon.svg"
            alt="Mermaid Sky Exporter"
            width={20}
            height={20}
            priority
            className="shrink-0"
          />
          <span className="truncate text-sm sm:text-base">
            Mermaid Sky Exporter
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onShare}
              disabled={isSharing}
              aria-busy={isSharing}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-slate-900/5 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
            >
              <ShareIcon className="size-4" aria-hidden />
              <span>
                {isSharing
                  ? canNativeShare
                    ? "Sharing..."
                    : "Copying..."
                  : canNativeShare
                    ? "Share"
                    : "Copy Link"}
              </span>
            </button>

            {showInstallButton ? (
              <button
                type="button"
                onClick={onInstall}
                disabled={isInstalling}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
              >
                <Download className="size-4" aria-hidden />
                <span>{isInstalling ? "Opening..." : "Install"}</span>
              </button>
            ) : null}

            <a
              href="https://mermaid.js.org/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:flex-none"
            >
              <BookOpenText className="size-4" aria-hidden />
              <span className="sm:hidden">Docs</span>
              <span className="hidden sm:inline">Mermaid Docs</span>
              <ExternalLink className="size-3.5 opacity-70" aria-hidden />
            </a>
          </div>

          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={[
              "min-h-4 text-[11px] leading-tight sm:text-right",
              helperTone === "error"
                ? "text-rose-600"
                : helperTone === "success"
                  ? "text-emerald-600"
                  : "text-slate-500",
            ].join(" ")}
          >
            {helperMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
