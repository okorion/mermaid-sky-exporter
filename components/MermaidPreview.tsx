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

// 노드/엣지 카운트
function countNodes(code: string): number {
  const m = code.match(/(\[.*?\]|\{.*?\}|\(\(.*?\)\))/g);
  return m ? m.length : 0;
}
function countEdges(code: string): number {
  // 기본적인 Mermaid 화살표/선 패턴들
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

  // 2) SVG 주입 (dangerouslySetInnerHTML 미사용)
  useEffect(() => {
    if (svgContainerRef.current) {
      svgContainerRef.current.innerHTML = rawSvg;
    }
  }, [rawSvg]);

  // 3) 오토핏 계산 (보정 로직 포함)
  const computeAndSetFit = useCallback(() => {
    if (!autoFit || !rawSvg || !wrapRef.current) {
      setFitScale(scale);
      return;
    }
    const wrap = wrapRef.current;
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
    if (!svgW || !svgH) {
      setFitScale(scale);
      return;
    }

    const nodes = countNodes(code);
    const edges = countEdges(code);

    // 기본 비율(가장 짧은 변 기준)
    const base = Math.min(wrapW / svgW, wrapH / svgH);

    // 그래프 규모에 따른 가중치와 한계값
    const MIN_FIT_SCALE = 0.5; // 너무 작게 보이는 것 방지
    const MAX_FIT_SCALE = 1.2; // 과도 확대 방지(작은 그래프)

    let s: number;

    if (nodes <= 4 && edges <= 4) {
      // 아주 작은 그래프: 100% 이상 키우지 않고 약간의 여백
      s = Math.min(base, 1) * 0.95;
    } else if (nodes <= 12) {
      // 작은~중간: 약간의 여백
      s = base * 0.95;
    } else if (nodes <= 60) {
      // 중간~큰: 더 넉넉한 여백
      s = base * 0.9;
    } else {
      // 매우 큰 그래프: 여백을 더 주지 않으면 라벨이 붙는 경우가 많음
      s = base * 0.85;
    }

    // 최종 클램프
    const clamped = Math.min(
      MAX_FIT_SCALE,
      Math.max(MIN_FIT_SCALE, Number(s.toFixed(3)))
    );
    setFitScale(clamped);
  }, [autoFit, rawSvg, scale, code]);

  // 4) 초기/리사이즈 시 오토핏
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(computeAndSetFit);
    ro.observe(el);

    computeAndSetFit();

    return () => {
      ro.unobserve(el);
    };
  }, [computeAndSetFit]);

  const appliedScale = useMemo(
    () => (autoFit ? fitScale : scale),
    [autoFit, fitScale, scale]
  );

  // ⛶ 버튼: 현재 컨테이너 기준 “전체 보기”로 재정렬
  const handleFitToView = () => {
    computeAndSetFit();
    const el = wrapRef.current;
    if (el) {
      el.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
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
      {/* ⛶ 버튼: 프리뷰 내부 고정(세로/가로 스크롤에도 고정) */}
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
