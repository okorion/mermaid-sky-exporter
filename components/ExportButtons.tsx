"use client";
import { useState } from "react";
import {
  downloadRasterForAspect,
  downloadRasterFromSVG,
  downloadSVG,
} from "@/libs/svgExport";

import { ASPECT_MAP, type AspectPreset } from "@/types/types";

export default function ExportButtons({
  svg,
  bg,
  exportScale,
}: {
  svg: string;
  bg: string;
  exportScale: number;
}) {
  const [preset, setPreset] = useState<AspectPreset>("3:2");

  return (
    <div className="toolbar flex flex-wrap items-center gap-2">
      {/* 원본 내보내기 */}
      <button
        type="button"
        className="btn"
        onClick={() => downloadSVG(svg, "diagram.svg")}
      >
        Export SVG
      </button>
      <button
        type="button"
        className="btn"
        onClick={() =>
          downloadRasterFromSVG(
            svg,
            "image/png",
            "diagram.png",
            exportScale,
            bg
          )
        }
      >
        Export PNG
      </button>
      <button
        type="button"
        className="btn"
        onClick={() =>
          downloadRasterFromSVG(
            svg,
            "image/jpeg",
            "diagram.jpg",
            exportScale,
            bg
          )
        }
      >
        Export JPG
      </button>

      {/* 프리셋 드롭다운 */}
      <div className="flex items-center gap-2">
        <label htmlFor="aspectPreset" className="text-sm font-semibold">
          Preset
        </label>
        <select
          id="aspectPreset"
          className="rounded-lg border border-slate-200 px-2 py-1"
          value={preset}
          onChange={(e) => setPreset(e.target.value as AspectPreset)}
          aria-label="Export aspect ratio preset"
        >
          <option value="3:2">3:2</option>
          <option value="4:3">4:3</option>
          <option value="16:9">16:9</option>
        </select>

        {/* 프리셋 PNG */}
        <button
          type="button"
          className="btn"
          onClick={() =>
            downloadRasterForAspect(svg, `diagram-${preset}.png`, "image/png", {
              aspect: ASPECT_MAP[preset],
              scale: exportScale,
              background: bg,
            })
          }
          title="선택한 비율을 만족하도록 가로 여백을 추가해 한눈에 보이도록 내보내기"
        >
          Export {preset} PNG
        </button>

        {/* 프리셋 JPG */}
        <button
          type="button"
          className="btn"
          onClick={() =>
            downloadRasterForAspect(
              svg,
              `diagram-${preset}.jpg`,
              "image/jpeg",
              {
                aspect: ASPECT_MAP[preset],
                scale: exportScale,
                background: bg,
              }
            )
          }
          title="선택한 비율을 만족하도록 가로 여백을 추가해 한눈에 보이도록 내보내기 (JPG)"
        >
          Export {preset} JPG
        </button>
      </div>
    </div>
  );
}
