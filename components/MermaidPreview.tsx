"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Theme } from "@/libs/presets";

type Props = {
  code: string;
  theme: Theme;
  bg: string;
  scale: number; // 수동 스케일(백업, autoFit=false일 때 사용)
  onSVG: (svg: string) => void;
  autoFit?: boolean; // 컨테이너에 맞춰 자동 스케일
};

const LARGE_GRAPH_THRESHOLD = 0.4;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

// ✅ 노드 카운트 함수
function countNodes(code: string): number {
  const matches = code.match(/(\[.*?\]|\{.*?\}|\(\(.*?\)\))/g);
  return matches ? matches.length : 0;
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
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [fitScale, setFitScale] = useState<number>(scale);

  const [zoomMode, setZoomMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const mermaidRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // ───────────────────────────────
  // 1) Mermaid 렌더
  // ───────────────────────────────
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
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
      } catch {
        if (!cancelled) {
          const err = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="60">
            <rect width="100%" height="100%" fill="#fee2e2"/>
            <text x="12" y="36" font-size="14" fill="#b91c1c">Mermaid Parse Error</text>
          </svg>`;
          setRawSvg(err);
          onSVG(err);
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, theme, onSVG]);

  // ───────────────────────────────
  // 2) Blob URL 생성
  // ───────────────────────────────
  useEffect(() => {
    if (!rawSvg) {
      setBlobUrl("");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([rawSvg], { type: "image/svg+xml" })
    );
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [rawSvg]);

  // ───────────────────────────────
  // 3) Auto-Fit 계산
  // ───────────────────────────────
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
        const parts = vb[1].trim().split(/\s+/).map(Number);
        if (parts.length === 4) {
          svgW = parts[2];
          svgH = parts[3];
        }
      }

      if (svgW && svgH) {
        const nodes = countNodes(code);
        let s: number;
        if (nodes <= 5) {
          // ✅ 노드 5개 이하: 세로 전체 맞춤
          s = wrapH / svgH;
        } else {
          // 일반 Auto-Fit
          s = Math.min(wrapW / svgW, wrapH / svgH);
        }
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

  const isLarge = fitScale < LARGE_GRAPH_THRESHOLD;

  // ───────────────────────────────
  // 4) 패닝/줌 이벤트
  // ───────────────────────────────
  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!(zoomMode || fullscreen)) return;
    isPanningRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };
  const onMouseUpOrLeave: React.MouseEventHandler<HTMLDivElement> = () => {
    isPanningRef.current = false;
  };
  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (!(zoomMode || fullscreen)) return;
    const delta = e.deltaY * (e.ctrlKey ? 0.001 : 0.002);
    setZoom((z) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((z - delta).toFixed(3))))
    );
  };

  // ───────────────────────────────
  // 5) ESC로 전체화면 닫기
  // ───────────────────────────────
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  // 현재 적용 스케일
  const appliedScale = useMemo(() => {
    if (fullscreen) return zoom;
    if (zoomMode) return 1;
    return autoFit ? fitScale : scale;
  }, [fullscreen, zoomMode, zoom, autoFit, fitScale, scale]);

  // 컨테이너 스타일
  const containerStyle: React.CSSProperties = {
    position: "relative",
    padding: 16,
    background: bg,
    overflow: "hidden",
    height: "calc(100vh - 220px)",
    userSelect: zoomMode || fullscreen ? "none" : "auto",
    cursor:
      zoomMode || fullscreen
        ? isPanningRef.current
          ? "grabbing"
          : "grab"
        : "default",
  };

  const objectStyle: React.CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${appliedScale})`,
    transformOrigin: "top left",
    width: "100%",
    height: "100%",
    display: "block",
  };

  return (
    <section
      ref={wrapRef}
      className="card"
      style={containerStyle}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUpOrLeave}
      onMouseLeave={onMouseUpOrLeave}
      onWheel={onWheel}
      aria-label="Mermaid diagram viewport"
    >
      {/* 컨트롤 버튼 */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          gap: 8,
          zIndex: 20, // ✅ 버튼이 항상 최상위
          pointerEvents: "auto", // ✅ 버튼 클릭 보장
        }}
      >
        {isLarge && (
          <button
            type="button"
            onClick={() => {
              setZoomMode((z) => !z);
              setPan({ x: 0, y: 0 });
              setZoom(1);
            }}
          >
            {zoomMode ? "Fit" : "🔍 Zoom"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setFullscreen(true);
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          ⛶ Fullscreen
        </button>
      </div>

      {blobUrl && (
        <object
          type="image/svg+xml"
          data={blobUrl}
          aria-label="Mermaid diagram preview"
          style={{
            ...objectStyle,
            zIndex: 10, // ✅ 그래프는 버튼 밑
            pointerEvents: zoomMode || fullscreen ? "none" : "auto",
          }}
        />
      )}
    </section>
  );
}
