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

const LARGE_GRAPH_THRESHOLD = 0.4; // fitScale이 0.4 미만이면 큰 그래프로 판단
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

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

  const [zoomMode, setZoomMode] = useState(false); // Fit ↔ 100%
  const [fullscreen, setFullscreen] = useState(false);

  // 패닝/줌 상태(줌 모드 또는 전체화면에서만 의미 있음)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const mermaidRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────
  // 1) Mermaid 렌더 (코드/테마 변경 시)
  // ─────────────────────────────────────────
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
        themeVariables: {
          primaryColor: "#38bdf8",
          primaryTextColor: "#0f172a",
          lineColor: "#0ea5e9",
          tertiaryColor: "#e0f2fe",
        },
      });

      try {
        const { svg } = await mermaid.render(`m-${Date.now()}`, code);
        if (!cancelled) {
          setRawSvg(svg);
          onSVG(svg);
          // 코드/테마 바뀌면 줌/패닝 초기화
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

  // ─────────────────────────────────────────
  // 2) Blob URL 생성/해제 (object 렌더용)
  // ─────────────────────────────────────────
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

  // ─────────────────────────────────────────
  // 3) Auto-Fit: 컨테이너에 맞춰 스케일 계산
  // ─────────────────────────────────────────
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

      // viewBox="minX minY width height" 파싱
      const vb = rawSvg.match(/viewBox\s*=\s*"([\d.\s-]+)"/i);
      let svgW = 0;
      let svgH = 0;

      if (vb?.[1]) {
        const parts = vb[1].trim().split(/\s+/).map(Number);
        if (parts.length === 4) {
          svgW = Number(parts[2]) || 0;
          svgH = Number(parts[3]) || 0;
        }
      } else {
        const w = rawSvg.match(/width\s*=\s*"([\d.]+)(px)?"/i)?.[1];
        const h = rawSvg.match(/height\s*=\s*"([\d.]+)(px)?"/i)?.[1];
        svgW = w ? Number(w) : 0;
        svgH = h ? Number(h) : 0;
      }

      if (svgW && svgH) {
        const s = Math.min(wrapW / svgW, wrapH / svgH);
        setFitScale(Math.max(0.1, Number(s.toFixed(3))));
      } else {
        setFitScale(scale);
      }
    };

    const ro = new ResizeObserver(compute);
    ro.observe(wrap);
    compute();
    return () => ro.disconnect();
  }, [autoFit, rawSvg, scale]);

  // 큰 그래프 판정
  const isLarge = fitScale < LARGE_GRAPH_THRESHOLD;

  // ─────────────────────────────────────────
  // 4) 마우스 드래그로 패닝 (줌 모드/전체화면에서만)
  // ─────────────────────────────────────────
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

  // 휠로 줌 (줌 모드/전체화면에서만)
  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (!(zoomMode || fullscreen)) return;
    // Ctrl 누르면 더 세밀하게
    const delta = e.deltaY * (e.ctrlKey ? 0.001 : 0.002);
    setZoom((z) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((z - delta).toFixed(3))))
    );
  };

  // ─────────────────────────────────────────
  // 5) 전체화면 모달 (ESC로 닫기)
  // ─────────────────────────────────────────
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
    if (fullscreen) return zoom; // 전체화면에선 사용자가 조절한 줌
    if (zoomMode) return 1; // 줌 모드: 원본 100%
    return autoFit ? fitScale : scale; // 기본: 화면 맞춤 or 수동
  }, [fullscreen, zoomMode, zoom, autoFit, fitScale, scale]);

  // 컨테이너 스타일
  const containerStyle: React.CSSProperties = {
    position: "relative",
    padding: 16,
    background: bg,
    overflow: "hidden",
    height: "calc(100vh - 220px)", // 상단 바 높이에 맞게 필요하면 조정
    userSelect: zoomMode || fullscreen ? "none" : "auto",
    cursor:
      zoomMode || fullscreen
        ? isPanningRef.current
          ? "grabbing"
          : "grab"
        : "default",
  };

  // object 스타일 (translate + scale)
  const objectStyle: React.CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${appliedScale})`,
    transformOrigin: "top left",
    width: "100%",
    height: "100%",
    display: "block",
    pointerEvents: "auto",
  };

  // 컨트롤 버튼 공통 스타일
  const btn: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    background: "#e0f2fe",
    padding: "8px 12px",
    borderRadius: 12,
    fontWeight: 700,
  };

  return (
    <>
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
        {/* 오버레이 컨트롤 */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 8,
            zIndex: 10,
          }}
        >
          {isLarge && (
            <button
              type="button"
              style={btn}
              onClick={() => {
                setZoomMode((z) => !z);
                setPan({ x: 0, y: 0 });
                setZoom(1);
              }}
              aria-pressed={zoomMode}
            >
              {zoomMode ? "Fit" : "🔍 Zoom"}
            </button>
          )}
          <button
            type="button"
            style={btn}
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
            style={objectStyle}
          />
        )}
      </section>

      {/* 전체화면 모달 */}
      {fullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mermaid diagram fullscreen preview"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUpOrLeave}
          onMouseLeave={onMouseUpOrLeave}
          onWheel={onWheel}
        >
          <div
            className="card"
            style={{
              position: "relative",
              width: "92vw",
              height: "92vh",
              background: bg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "flex",
                gap: 8,
                zIndex: 10,
              }}
            >
              <button
                type="button"
                style={btn}
                onClick={() => {
                  setZoom((z) =>
                    Math.min(MAX_ZOOM, Number((z * 1.1).toFixed(3)))
                  );
                }}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                style={btn}
                onClick={() => {
                  setZoom((z) =>
                    Math.max(MIN_ZOOM, Number((z / 1.1).toFixed(3)))
                  );
                }}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                style={btn}
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                aria-label="Reset view"
              >
                Reset
              </button>
              <button
                type="button"
                style={btn}
                onClick={() => setFullscreen(false)}
                aria-label="Close fullscreen (Esc)"
              >
                ✕
              </button>
            </div>

            {blobUrl && (
              <object
                type="image/svg+xml"
                data={blobUrl}
                aria-label="Mermaid diagram fullscreen"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "top left",
                  width: "100%",
                  height: "100%",
                  display: "block",
                  pointerEvents: "auto",
                  cursor: isPanningRef.current ? "grabbing" : "grab",
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
