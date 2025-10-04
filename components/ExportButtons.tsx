"use client";
import { downloadRasterFromSVG, downloadSVG } from "@/libs/svgExport";

export default function ExportButtons({
  svg,
  bg,
  exportScale,
}: {
  svg: string;
  bg: string;
  exportScale: number;
}) {
  return (
    <div className="toolbar">
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
    </div>
  );
}
