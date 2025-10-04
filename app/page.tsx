"use client";
import { useEffect, useMemo, useState } from "react";
import EditorSwitcher from "@/components/EditorSwitcher";
import ExportButtons from "@/components/ExportButtons";
import MermaidPreview from "@/components/MermaidPreview";
import TopBar from "@/components/TopBar";
import { DEFAULTS, SAMPLE, THEMES, type Theme } from "@/libs/presets";
import { decodeShareState } from "@/libs/share";

type Mode = "monaco" | "codemirror";

export default function Page() {
  const [code, setCode] = useState(SAMPLE);
  const [theme, setTheme] = useState<Theme>(DEFAULTS.theme);
  const [bg, setBg] = useState(DEFAULTS.bg);
  const [scale, setScale] = useState(DEFAULTS.scale);
  const [exportScale, setExportScale] = useState(DEFAULTS.exportScale);
  const [editorMode, setEditorMode] = useState<Mode>("codemirror");
  const [svg, setSvg] = useState("");

  useEffect(() => {
    const s = new URLSearchParams(location.search).get("s");
    if (s) {
      const restored = decodeShareState<any>(s);
      if (restored) {
        setCode(restored.code ?? SAMPLE);
        setTheme(restored.theme ?? DEFAULTS.theme);
        setBg(restored.bg ?? DEFAULTS.bg);
        setScale(restored.scale ?? DEFAULTS.scale);
        setExportScale(restored.exportScale ?? DEFAULTS.exportScale);
        setEditorMode(restored.editorMode ?? "codemirror");
      }
    }
  }, []);

  const shareState = useMemo(
    () => ({ code, theme, bg, scale, exportScale, editorMode }),
    [code, theme, bg, scale, exportScale, editorMode]
  );

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <TopBar state={shareState} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <EditorSwitcher
            code={code}
            onChange={setCode}
            mode={editorMode}
            onModeChange={setEditorMode}
          />
        </div>
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <label htmlFor="themeSelect">Theme</label>
            <select
              id="themeSelect"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <label htmlFor="bgPicker">Background</label>
            <input
              id="bgPicker"
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
            />

            <label htmlFor="previewScale">Preview Scale</label>
            <input
              id="previewScale"
              type="number"
              min={0.25}
              max={4}
              step={0.25}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
            />

            <label htmlFor="exportScale">Export Scale</label>
            <input
              id="exportScale"
              type="number"
              min={1}
              max={6}
              step={1}
              value={exportScale}
              onChange={(e) => setExportScale(parseInt(e.target.value))}
            />
          </div>
          <MermaidPreview
            code={code}
            theme={theme}
            bg={bg}
            scale={scale} // 수동 스케일은 백업
            autoFit={true} // ✅ 한 화면에 보이도록 자동 맞춤
            onSVG={setSvg}
          />
          <div style={{ marginTop: 12 }}>
            <ExportButtons svg={svg} bg={bg} exportScale={exportScale} />
          </div>
        </div>
      </div>
    </main>
  );
}
