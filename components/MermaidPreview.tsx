"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const EPS = 0.005;

// 노드/엣지 카운트
function countNodes(code: string): number {
  const m = code.match(/(\[.*?\]|\{.*?\}|\(\(.*?\)\))/g);
  return m ? m.length : 0;
}
function countEdges(code: string): number {
  const m = code.match(/-->|-\.->|===|--/g);
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
  const fitScaleRef = useRef<number>(scale);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<any>(null);

  // ✅ setFitScaleSafe를 useCallback으로 안정화
  const setFitScaleSafe = useCallback((v: number) => {
    fitScaleRef.current = v;
    setFitScale(v);
  }, []); // setState 세터는 안정적이라 deps 비워도 됨

  // autoFit 끄면 외부 scale에 즉시 동기화
  useEffect(() => {
    if (!autoFit && Math.abs(fitScaleRef.current - scale) > EPS) {
      setFitScaleSafe(scale);
    }
  }, [autoFit, scale, setFitScaleSafe]); // ✅ 의존성 추가

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

  // 2) SVG 주입
  useEffect(() => {
    if (svgContainerRef.current) {
      svgContainerRef.current.innerHTML = rawSvg;
    }
  }, [rawSvg]);

  // 3) 오토핏 계산
  const computeAndSetFit = useCallback(() => {
    if (!autoFit || !rawSvg || !wrapRef.current) {
      if (Math.abs(fitScaleRef.current - scale) > EPS) setFitScaleSafe(scale);
      return;
    }
    const wrap = wrapRef.current;

    // 패딩 제거한 실사용 영역
    const cs = getComputedStyle(wrap);
    const padX =
      parseFloat(cs.paddingLeft || "0") + parseFloat(cs.paddingRight || "0");
    const padY =
      parseFloat(cs.paddingTop || "0") + parseFloat(cs.paddingBottom || "0");
    const usableW = Math.max(0, wrap.clientWidth - padX);
    const usableH = Math.max(0, wrap.clientHeight - padY);
    if (!usableW || !usableH) return;

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
    if (!svgW || !svgH) {
      if (Math.abs(fitScaleRef.current - scale) > EPS) setFitScaleSafe(scale);
      return;
    }

    const nodes = countNodes(code);
    const edges = countEdges(code);

    const SAFE_MARGIN = 1;
    const base = Math.min(
      (usableW - SAFE_MARGIN) / svgW,
      (usableH - SAFE_MARGIN) / svgH
    );

    const MIN_FIT_SCALE = 0.5;
    const MAX_FIT_SCALE = 1.2;

    let s: number;
    if (nodes <= 4 && edges <= 4) s = Math.min(base, 1) * 0.95;
    else if (nodes <= 12) s = base * 0.95;
    else if (nodes <= 60) s = base * 0.9;
    else s = base * 0.85;

    const clamped = Math.min(
      MAX_FIT_SCALE,
      Math.max(MIN_FIT_SCALE, Number(s.toFixed(3)))
    );

    if (Math.abs(clamped - fitScaleRef.current) > EPS) {
      setFitScaleSafe(clamped);
    }
  }, [autoFit, rawSvg, scale, code, setFitScaleSafe]); // ✅ 의존성 추가

  // 4) 초기/리사이즈 시 오토핏 (raf 디바운스)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(computeAndSetFit);
    });
    ro.observe(el);
    computeAndSetFit();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [computeAndSetFit]);

  const appliedScale = useMemo(
    () => (autoFit ? fitScale : scale),
    [autoFit, fitScale, scale]
  );

  const handleFitToView = () => {
    computeAndSetFit();
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
      {/* ⛶ 버튼 */}
      <div className="sticky top-2 left-0 right-0 z-30">
        <div className="flex justify-end pr-2 pointer-events-none">
          <button
            type="button"
            onClick={handleFitToView}
            className="pointer-events-auto rounded-md bg-white/80 border border-slate-200 px-2 py-1 text-sm shadow-sm hover:bg-white active:scale-[0.97] transition"
            title="전체 보기"
            aria-label="전체 보기"
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Preview 콘텐츠 */}
      <div
        className="flex items-start justify-center"
        style={{
          transform: `scale(${appliedScale})`,
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
