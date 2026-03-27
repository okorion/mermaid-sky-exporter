"use client";

import { useMemo } from "react";
import {
  downloadRasterForAspect,
  downloadRasterFromSVG,
  downloadSVG,
} from "@/libs/svgExport";
import {
  ASPECT_MAP,
  type ExportAspectOption,
  type ExportFormat,
} from "@/types/types";

export default function ExportButtons({
  code,
  aspect,
  bg,
  className = "",
  exportScale,
  filename,
  format,
  onAspectChange,
  onFilenameChange,
  onFormatChange,
  svg,
}: {
  code: string;
  aspect: ExportAspectOption;
  bg: string;
  className?: string;
  exportScale: number;
  filename: string;
  format: ExportFormat;
  onAspectChange: (value: ExportAspectOption) => void;
  onFilenameChange: (value: string) => void;
  onFormatChange: (value: ExportFormat) => void;
  svg: string;
}) {
  const hasExportableDiagram = code.trim().length > 0 && svg.trim().length > 0;
  const isAspectDisabled = format === "svg" || !hasExportableDiagram;

  const hint = useMemo(() => {
    if (!hasExportableDiagram) {
      return "Render a valid Mermaid diagram to enable export.";
    }
    if (format === "svg") {
      return "SVG export stays vector-based and ignores aspect presets.";
    }
    if (aspect === "original") {
      return "Exports at the diagram's original aspect ratio.";
    }
    return `Exports on a ${aspect} canvas and centers the diagram.`;
  }, [aspect, format, hasExportableDiagram]);

  const handleExport = () => {
    if (!hasExportableDiagram) return;

    if (format === "svg") {
      downloadSVG(svg, filename);
      return;
    }

    const mime = format === "png" ? "image/png" : "image/jpeg";

    if (aspect === "original") {
      downloadRasterFromSVG(svg, mime, filename, exportScale, bg);
      return;
    }

    downloadRasterForAspect(svg, filename, mime, {
      aspect: ASPECT_MAP[aspect],
      scale: exportScale,
      background: bg,
    });
  };

  return (
    <section
      className={["min-w-0", className].join(" ")}
      aria-label="Export toolbar"
    >
      <div
        className={[
          "flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70",
          "backdrop-blur px-2 py-1 shadow-sm whitespace-nowrap overflow-x-auto",
        ].join(" ")}
      >
        <label htmlFor="filename" className="sr-only">
          File name
        </label>
        <input
          id="filename"
          value={filename}
          onChange={(e) => onFilenameChange(e.target.value)}
          className="max-w-[160px] truncate rounded-lg border border-slate-200 px-2 h-8 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="diagram"
          spellCheck={false}
        />

        <span className="text-slate-300 select-none">/</span>

        <label htmlFor="format" className="sr-only">
          Export format
        </label>
        <select
          id="format"
          value={format}
          onChange={(e) => onFormatChange(e.target.value as ExportFormat)}
          disabled={!hasExportableDiagram}
          className={[
            "rounded-lg border border-slate-200 px-2 h-8 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-300",
            !hasExportableDiagram ? "cursor-not-allowed opacity-60" : "",
          ].join(" ")}
          aria-label="Export format"
          title={
            hasExportableDiagram
              ? "Choose an export format"
              : "Render a valid Mermaid diagram before choosing an export format"
          }
        >
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="svg">SVG</option>
        </select>

        <label htmlFor="aspect" className="sr-only">
          Aspect ratio
        </label>
        <select
          id="aspect"
          value={isAspectDisabled ? "original" : aspect}
          onChange={(e) => onAspectChange(e.target.value as ExportAspectOption)}
          disabled={isAspectDisabled}
          className={[
            "rounded-lg border border-slate-200 px-2 h-8 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-300",
            isAspectDisabled ? "cursor-not-allowed opacity-60" : "",
          ].join(" ")}
          aria-label="Aspect ratio preset"
        >
          <option value="original">Original</option>
          <option value="3:2">3:2</option>
          <option value="4:3">4:3</option>
          <option value="16:9">16:9</option>
        </select>

        <button
          type="button"
          onClick={handleExport}
          disabled={!hasExportableDiagram}
          title={
            hasExportableDiagram
              ? "Export diagram"
              : "Render a valid Mermaid diagram before exporting"
          }
          aria-disabled={!hasExportableDiagram}
          className={[
            "ml-1 rounded-lg px-3 h-8 text-sm font-semibold text-white shadow-sm transition",
            hasExportableDiagram
              ? "bg-slate-900 hover:bg-slate-800 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-300"
              : "cursor-not-allowed bg-slate-400 opacity-70",
          ].join(" ")}
        >
          Export
        </button>
      </div>

      <p
        className="mt-1 text-[11px] leading-tight text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis"
        aria-live="polite"
      >
        {hint}
      </p>
    </section>
  );
}
