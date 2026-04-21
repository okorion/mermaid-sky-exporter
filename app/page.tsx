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
    const shareState = new URLSearchParams(location.search).get("s");
    if (!shareState) return;

    const restored = decodeShareState<ShareState>(shareState);
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

  const stateForSharing = useMemo(
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
    <main className="app-shell mx-auto max-w-[1400px]">
      <TopBar state={stateForSharing} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(360px,480px)_1fr]">
        <aside
          className="h-fit self-start rounded-2xl border border-slate-200/80 bg-white/70 p-3 shadow-sm backdrop-blur lg:sticky lg:p-4"
          style={{ top: "calc(var(--safe-top) + 1rem)" }}
        >
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

        <section className="flex flex-col rounded-2xl border border-slate-200/80 bg-white/60 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 border-b border-slate-200/70 p-3 lg:flex-row lg:items-start lg:justify-between lg:p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2">
                <label
                  htmlFor="themeSelect"
                  className="text-xs font-medium leading-none text-slate-700"
                >
                  Theme
                </label>
                <select
                  id="themeSelect"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                  className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {THEMES.map((itemTheme) => (
                    <option key={itemTheme} value={itemTheme}>
                      {itemTheme}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inline-flex items-center gap-2">
                <label
                  htmlFor="bgPicker"
                  className="text-xs font-medium leading-none text-slate-700"
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

            <div className="min-w-0 lg:ml-auto lg:max-w-full">
              <ExportButtons
                code={code}
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
