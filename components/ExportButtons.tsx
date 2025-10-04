"use client";
import { useMemo, useState } from "react";
import {
  downloadRasterForAspect,
  downloadRasterFromSVG,
  downloadSVG,
} from "@/libs/svgExport";
import { ASPECT_MAP, type AspectPreset } from "@/types/types";

type ExportFormat = "svg" | "png" | "jpg";
type AspectOption = "original" | AspectPreset;

export default function ExportButtons({
  svg,
  bg,
  exportScale,
  className = "",
}: {
  svg: string;
  bg: string;
  exportScale: number;
  className?: string;
}) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [aspect, setAspect] = useState<AspectOption>("original");
  const [filename, setFilename] = useState("diagram");

  const hint = useMemo(() => {
    if (format === "svg")
      return "SVG는 벡터 포맷이라 비율/배경 개념이 없습니다.";
    if (aspect === "original") return "원본 비율·배율로 내보냅니다.";
    return `프리셋 비율(${aspect})로 캔버스를 맞춰 내보냅니다.`;
  }, [format, aspect]);

  const handleExport = () => {
    if (!svg) return;

    if (format === "svg") {
      downloadSVG(svg, `${filename}.svg`);
      return;
    }
    const mime = format === "png" ? "image/png" : "image/jpeg";
    const ext = format === "png" ? "png" : "jpg";

    if (aspect === "original") {
      downloadRasterFromSVG(svg, mime, `${filename}.${ext}`, exportScale, bg);
    } else {
      downloadRasterForAspect(svg, `${filename}.${ext}`, mime, {
        aspect: ASPECT_MAP[aspect],
        scale: exportScale,
        background: bg,
      });
    }
  };

  const isAspectDisabled = format === "svg";

  return (
    <div
      className={["min-w-0", className].join(" ")}
      aria-label="Export toolbar"
    >
      {/* ── 툴바 (한 줄) ───────────────────────────────────────────── */}
      <div
        className={[
          "flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70",
          "backdrop-blur px-2 py-1 shadow-sm whitespace-nowrap overflow-x-auto",
        ].join(" ")}
      >
        {/* 파일명 */}
        <label htmlFor="filename" className="sr-only">
          파일명
        </label>
        <input
          id="filename"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          className="max-w-[160px] truncate rounded-lg border border-slate-200 px-2 h-8 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="diagram"
          spellCheck={false}
        />

        <span className="text-slate-300 select-none">•</span>

        {/* 포맷 */}
        <label htmlFor="format" className="sr-only">
          포맷
        </label>
        <select
          id="format"
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          className="rounded-lg border border-slate-200 px-2 h-8 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Export format"
        >
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="svg">SVG</option>
        </select>

        {/* 비율 */}
        <label htmlFor="aspect" className="sr-only">
          비율
        </label>
        <select
          id="aspect"
          value={isAspectDisabled ? "original" : aspect}
          onChange={(e) => setAspect(e.target.value as AspectOption)}
          disabled={isAspectDisabled}
          className={[
            "rounded-lg border border-slate-200 px-2 h-8 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-300",
            isAspectDisabled ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
          aria-label="Aspect ratio preset"
        >
          <option value="original">원본</option>
          <option value="3:2">3:2</option>
          <option value="4:3">4:3</option>
          <option value="16:9">16:9</option>
        </select>

        {/* Export 버튼 */}
        <button
          type="button"
          onClick={handleExport}
          className="ml-1 rounded-lg px-3 h-8 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-300 transition shadow-sm"
        >
          Export
        </button>
      </div>

      {/* ── 상시 노출 힌트 (한 줄, 말줄임) ─────────────────────────── */}
      <p
        className="mt-1 text-[11px] leading-tight text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis"
        aria-live="polite"
      >
        {hint}
      </p>
    </div>
  );
}
