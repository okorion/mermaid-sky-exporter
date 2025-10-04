"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Theme } from "@/libs/presets";

type Props = {
  code: string;
  theme: Theme;
  bg: string;
  scale: number;
  onSVG: (svg: string) => void;
  autoFit?: boolean;
};

const FIXED_PREVIEW_HEIGHT_PX = 500;

function countNodes(code: string): number {
  const m = code.match(/(\[.*?\]|\{.*?\}|\(\(.*?\)\))/g);
  return m ? m.length : 0;
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

  const mermaidRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // 1) Mermaid 렌더
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!mermaidRef.current) {
        const mod = await import("mermaid");
        mermaidRef.current = mod.default ?? mod;
      }
      const mermaid = mermaidRef.current;
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === "custom" ? "base" : theme,
        securityLevel: "strict",
        fontFamily: "Inter, Pretendard, system-ui, sans-serif",
      });

      try {
        const { svg } = await mermaid.render(`m-${Date.now()}`, code);
        if (!cancelled) {
          setRawSvg(svg);
          onSVG(svg);
        }
      } catch {
        if (!cancelled) {
          const err = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="60">
            <rect width="100%" height="100%" fill="#fee2e2"/>
            <text x="12" y="36" font-size="14" fill="#b91c1c">Mermaid Parse Error</text>
          </svg>`;
          setRawSvg(err);
          onSVG(err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, theme, onSVG]);

  // 2) SVG 안전하게 DOM에 주입
  useEffect(() => {
    if (svgContainerRef.current) {
      svgContainerRef.current.innerHTML = rawSvg;
    }
  }, [rawSvg]);

  // 3) Auto-Fit 계산
  useEffect(() => {
    if (!autoFit || !rawSvg || !wrapRef.current) {
      setFitScale(scale);
      return;
    }
    const wrap = wrapRef.current;
    const compute = () => {
      const wrapW = wrap.clientWidth;
      const wrapH = wrap.clientHeight;
      if (!wrapW || !wrapH) return;

      const vb = rawSvg.match(/viewBox\s*=\s*"([\d.\s-]+)"/i);
      let svgW = 0,
        svgH = 0;
      if (vb?.[1]) {
        const p = vb[1].trim().split(/\s+/).map(Number);
        if (p.length === 4) {
          svgW = p[2];
          svgH = p[3];
        }
      }

      if (svgW && svgH) {
        const nodes = countNodes(code);
        const s =
          nodes <= 5 ? wrapH / svgH : Math.min(wrapW / svgW, wrapH / svgH);
        setFitScale(Math.max(0.1, Number(s.toFixed(3))));
      } else {
        setFitScale(scale);
      }
    };

    const ro = new ResizeObserver(compute);
    ro.observe(wrap);
    compute();
    return () => ro.disconnect();
  }, [autoFit, rawSvg, scale, code]);

  const appliedScale = useMemo(
    () => (autoFit ? fitScale : scale),
    [autoFit, fitScale, scale]
  );

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
      <div
        className="flex items-start justify-center"
        style={{
          transform: `scale(${appliedScale})`,
          transformOrigin: "top left",
          padding: 8,
        }}
      >
        {/* ✅ 안전한 방식: ref에 직접 innerHTML 할당 */}
        <div
          ref={svgContainerRef}
          style={{
            maxWidth: "none",
            maxHeight: "none",
          }}
        />
      </div>
    </section>
  );
}
