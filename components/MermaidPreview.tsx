"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Theme } from "@/libs/presets";

type Props = {
  code: string;
  theme: Theme;
  bg: string;
  scale: number;
  onSVG: (svg: string) => void;
  autoFit?: boolean;
};

type MermaidRuntime = typeof import("mermaid").default;
type MermaidConfig = Parameters<MermaidRuntime["initialize"]>[0];

const FIXED_PREVIEW_HEIGHT_PX = 500;
const EPS = 0.005;
const FIT_PADDING_PX = 16;
const MIN_FIT_SCALE = 0.4;
const MAX_FIT_SCALE = 1.2;

const ERROR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="88" viewBox="0 0 420 88" role="img" aria-label="Mermaid parse error">
  <rect width="100%" height="100%" rx="12" fill="#fee2e2" />
  <text x="18" y="34" font-size="16" font-weight="700" fill="#991b1b">Mermaid Parse Error</text>
  <text x="18" y="58" font-size="13" fill="#7f1d1d">Check the diagram syntax and try again.</text>
</svg>`;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseSvgLength(value: string | null) {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseSvgIntrinsicSize(svgString: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.documentElement;

  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox
      .trim()
      .split(/[\s,]+/)
      .map((part) => Number.parseFloat(part));
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const width = parseSvgLength(svg.getAttribute("width"));
  const height = parseSvgLength(svg.getAttribute("height"));
  if (width > 0 && height > 0) {
    return { width, height };
  }

  return null;
}

export default function MermaidPreview({
  code,
  theme,
  bg,
  scale,
  onSVG,
  autoFit = true,
}: Props) {
  const [rawSvg, setRawSvg] = useState("");
  const [fitScale, setFitScale] = useState<number>(scale);
  const fitScaleRef = useRef<number>(scale);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<MermaidRuntime | null>(null);
  const renderSeqRef = useRef(0);
  const fitRafRef = useRef<number | null>(null);
  const resolvedTheme: MermaidConfig["theme"] =
    theme === "custom" ? "base" : theme;

  const setFitScaleSafe = useCallback((nextScale: number) => {
    if (Math.abs(fitScaleRef.current - nextScale) <= EPS) {
      return;
    }
    fitScaleRef.current = nextScale;
    setFitScale(nextScale);
  }, []);

  useEffect(() => {
    if (!autoFit) {
      setFitScaleSafe(scale);
    }
  }, [autoFit, scale, setFitScaleSafe]);

  useEffect(() => {
    let cancelled = false;
    const renderId = ++renderSeqRef.current;

    (async () => {
      try {
        if (!mermaidRef.current) {
          const mod = await import("mermaid");
          mermaidRef.current = mod.default ?? mod;
        }

        const mermaid = mermaidRef.current;
        if (!mermaid) {
          throw new Error("Mermaid runtime was not initialized.");
        }
        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme,
          securityLevel: "strict",
          fontFamily: "Inter, Pretendard, system-ui, sans-serif",
        });

        const { svg } = await mermaid.render(`m-${renderId}`, code);
        if (!cancelled && renderSeqRef.current === renderId) {
          setRawSvg(svg);
          onSVG(svg);
        }
      } catch {
        if (!cancelled && renderSeqRef.current === renderId) {
          setRawSvg(ERROR_SVG);
          onSVG(ERROR_SVG);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, onSVG, resolvedTheme]);

  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) {
      return;
    }
    container.innerHTML = rawSvg;
  }, [rawSvg]);

  const scheduleFit = useCallback(() => {
    if (fitRafRef.current !== null) {
      cancelAnimationFrame(fitRafRef.current);
    }

    fitRafRef.current = requestAnimationFrame(() => {
      fitRafRef.current = null;

      const wrap = wrapRef.current;
      if (!wrap || !rawSvg) {
        setFitScaleSafe(scale);
        return;
      }

      const size = parseSvgIntrinsicSize(rawSvg);
      if (!autoFit || !size) {
        setFitScaleSafe(scale);
        return;
      }

      const cs = getComputedStyle(wrap);
      const padX =
        Number.parseFloat(cs.paddingLeft || "0") +
        Number.parseFloat(cs.paddingRight || "0");
      const padY =
        Number.parseFloat(cs.paddingTop || "0") +
        Number.parseFloat(cs.paddingBottom || "0");

      const usableW = Math.max(0, wrap.clientWidth - padX - FIT_PADDING_PX);
      const usableH = Math.max(0, wrap.clientHeight - padY - FIT_PADDING_PX);
      if (!usableW || !usableH) {
        return;
      }

      const baseScale = Math.min(usableW / size.width, usableH / size.height);
      const nextScale = clamp(
        Number((baseScale * 0.96).toFixed(3)),
        MIN_FIT_SCALE,
        MAX_FIT_SCALE,
      );
      setFitScaleSafe(nextScale);
    });
  }, [autoFit, rawSvg, scale, setFitScaleSafe]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let cancelled = false;
    const ro = new ResizeObserver(() => {
      if (!cancelled) {
        scheduleFit();
      }
    });

    ro.observe(wrap);
    const svg = svgContainerRef.current?.querySelector("svg");
    if (svg) {
      ro.observe(svg);
    }

    scheduleFit();

    return () => {
      cancelled = true;
      if (fitRafRef.current !== null) {
        cancelAnimationFrame(fitRafRef.current);
        fitRafRef.current = null;
      }
      ro.disconnect();
    };
  }, [scheduleFit]);

  const handleFitToView = () => {
    scheduleFit();
    const el = wrapRef.current;
    if (el) el.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  return (
    <section
      ref={wrapRef}
      className="relative rounded-xl border border-slate-200 bg-white shadow-sm overflow-auto"
      style={{
        background: bg,
        height: `${FIXED_PREVIEW_HEIGHT_PX}px`,
        overscrollBehavior: "contain",
        padding: 12,
      }}
      onWheelCapture={(e) => e.stopPropagation()}
      aria-label="Mermaid diagram viewport"
    >
      <div className="sticky top-2 left-0 right-0 z-30">
        <div className="flex justify-end pr-2 pointer-events-none">
          <button
            type="button"
            onClick={handleFitToView}
            className="pointer-events-auto rounded-md bg-white/80 border border-slate-200 px-2 py-1 text-sm shadow-sm hover:bg-white active:scale-[0.97] transition"
            title="Fit to view"
            aria-label="Fit to view"
          >
            Fit
          </button>
        </div>
      </div>

      <div
        className="flex items-start justify-center"
        style={{
          transform: `scale(${autoFit ? fitScale : scale})`,
          transformOrigin: "top left",
          padding: 8,
        }}
      >
        <div
          ref={svgContainerRef}
          style={{ maxWidth: "none", maxHeight: "none" }}
        />
      </div>
    </section>
  );
}
