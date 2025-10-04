"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

type Mode = "monaco" | "codemirror";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const CodeMirror = dynamic(
  () => import("@uiw/react-codemirror").then((m) => m.default),
  { ssr: false }
);

type Props = {
  code: string;
  onChange: (v: string) => void;
  mode: Mode;
  onModeChange: (m: Mode) => void;
};

export default function EditorSwitcher({
  code,
  onChange,
  mode,
  onModeChange,
}: Props) {
  const [height, setHeight] = useState(420);

  useEffect(() => {
    const onResize = () =>
      setHeight(Math.max(320, Math.round(window.innerHeight * 0.5)));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="toolbar" style={{ marginBottom: 8 }}>
        <label htmlFor="editorMode">Editor</label>
        <select
          id="editorMode"
          value={mode}
          onChange={(e) =>
            onModeChange(e.target.value as "monaco" | "codemirror")
          }
        >
          <option value="monaco">Monaco</option>
          <option value="codemirror">CodeMirror</option>
        </select>
        <small>
          Mermaid 문법 하이라이트는 에디터 플러그인 추가로 확장 가능
        </small>
      </div>

      {mode === "monaco" ? (
        <Monaco
          height={height}
          defaultLanguage="markdown"
          value={code}
          onChange={(v) => onChange(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
          }}
        />
      ) : (
        <CodeMirror
          height={`${height}px`}
          value={code}
          onChange={onChange}
          basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
        />
      )}
    </div>
  );
}
