"use client";

import { useEffect, useMemo, useState } from "react";
import EditorSwitcher from "@/components/EditorSwitcher";
import ExportButtons from "@/components/ExportButtons";
import MermaidPreview from "@/components/MermaidPreview";
import TopBar from "@/components/TopBar";
import { DEFAULTS, SAMPLE, THEMES, type Theme } from "@/libs/presets";
import { decodeShareState } from "@/libs/share";
import type { ExportAspectOption, ExportFormat, Mode } from "@/types/types";

type ShareState = {
  bg?: string;
  code?: string;
  editorMode?: Mode;
  exportAspect?: ExportAspectOption;
  exportFilename?: string;
  exportFormat?: ExportFormat;
  exportScale?: number;
  scale?: number;
  theme?: Theme;
};

const DEFAULT_EXPORT_FORMAT: ExportFormat = "png";
const DEFAULT_EXPORT_ASPECT: ExportAspectOption = "original";
const DEFAULT_EXPORT_FILENAME = "diagram";

export default function Page() {
  const [code, setCode] = useState(SAMPLE);
  const [theme, setTheme] = useState<Theme>(DEFAULTS.theme);
  const [bg, setBg] = useState(DEFAULTS.bg);
  const [scale, setScale] = useState(DEFAULTS.scale);
  const [exportScale, setExportScale] = useState(DEFAULTS.exportScale);
  const [exportFormat, setExportFormat] = useState<ExportFormat>(
    DEFAULT_EXPORT_FORMAT,
  );
  const [exportAspect, setExportAspect] = useState<ExportAspectOption>(
    DEFAULT_EXPORT_ASPECT,
  );
  const [exportFilename, setExportFilename] = useState(DEFAULT_EXPORT_FILENAME);
  const [editorMode, setEditorMode] = useState<Mode>("codemirror");
  const [svg, setSvg] = useState("");

  useEffect(() => {
    const s = new URLSearchParams(location.search).get("s");
    if (!s) return;

    const restored = decodeShareState<ShareState>(s);
    if (!restored) return;

    setCode(restored.code ?? SAMPLE);
    setTheme(restored.theme ?? DEFAULTS.theme);
    setBg(restored.bg ?? DEFAULTS.bg);
    setScale(restored.scale ?? DEFAULTS.scale);
    setExportScale(restored.exportScale ?? DEFAULTS.exportScale);
    setExportFormat(restored.exportFormat ?? DEFAULT_EXPORT_FORMAT);
    setExportAspect(restored.exportAspect ?? DEFAULT_EXPORT_ASPECT);
    setExportFilename(restored.exportFilename ?? DEFAULT_EXPORT_FILENAME);
    setEditorMode(restored.editorMode ?? "codemirror");
  }, []);

  const shareState = useMemo(
    () => ({
      code,
      theme,
      bg,
      scale,
      exportScale,
      exportFormat,
      exportAspect,
      exportFilename,
      editorMode,
    }),
    [
      bg,
      code,
      editorMode,
      exportAspect,
      exportFilename,
      exportFormat,
      exportScale,
      scale,
      theme,
    ],
  );

  return (
    <main className="mx-auto max-w-[1400px] p-4">
      <TopBar state={shareState} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(360px,480px)_1fr]">
        <aside className="h-fit sticky top-4 self-start rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur p-3 lg:p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Editor</span>
            <div className="text-[11px] text-slate-500">Mode: {editorMode}</div>
          </div>

          <EditorSwitcher
            code={code}
            onChange={setCode}
            mode={editorMode}
            onModeChange={setEditorMode}
          />
        </aside>

        <section className="rounded-2xl border border-slate-200/80 bg-white/60 backdrop-blur shadow-sm flex flex-col">
          <div className="flex flex-wrap items-center gap-2 lg:gap-3 border-b border-slate-200/70 p-3 lg:p-4 h-22">
            <div className="flex flex-wrap items-center gap-3 self-start mt-1">
              <div className="inline-flex items-center gap-2">
                <label
                  htmlFor="themeSelect"
                  className="text-xs font-medium text-slate-700 leading-none"
                >
                  Theme
                </label>
                <select
                  id="themeSelect"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                  className="h-8 rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 bg-white"
                >
                  {THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inline-flex items-center gap-2">
                <label
                  htmlFor="bgPicker"
                  className="text-xs font-medium text-slate-700 leading-none"
                >
                  Background
                </label>
                <input
                  id="bgPicker"
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="h-8 w-10 rounded-lg border border-slate-200 p-1.5"
                />
              </div>
            </div>

            <div className="ml-auto self-center">
              <ExportButtons
                aspect={exportAspect}
                svg={svg}
                bg={bg}
                exportScale={exportScale}
                filename={exportFilename}
                format={exportFormat}
                onAspectChange={setExportAspect}
                onFilenameChange={setExportFilename}
                onFormatChange={setExportFormat}
                className="bg-white/80"
              />
            </div>
          </div>

          <div className="relative flex-1 p-3 lg:p-4">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="p-2">
                <MermaidPreview
                  code={code}
                  theme={theme}
                  bg={bg}
                  scale={scale}
                  autoFit={true}
                  onSVG={setSvg}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
