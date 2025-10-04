// libs/svgExport.ts
import { Canvg } from "canvg";

/** SVG 원본 저장 */
export async function downloadSVG(svg: string, filename = "diagram.svg") {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  trigger(blob, filename);
}

/** ✅ 프리셋용: 목표 가로/세로 비(Aspect, W/H)를 최소로 보장해 Contain 중앙 배치 */
export async function downloadRasterForAspect(
  svg: string,
  filename: string,
  type: "image/png" | "image/jpeg",
  opts: {
    aspect: number; // 목표 최소 W/H (예: 3:2 → 1.5, 4:3 → 1.3333, 16:9 → 1.7777)
    scale?: number; // 기본 2
    background?: string; // 여백/배경색 (프리뷰 bg 전달)
  }
) {
  const scale = opts.scale ?? 2;
  const bg = opts.background ?? "#ffffff";
  const targetAspect = Math.max(0.1, opts.aspect);

  // 1) 텍스트 보존 + 라벨 배경 선합성(pre-compose)
  const textified = foreignObjectToCenteredText(svg, {
    canvasBg: bg,
    precompose: true,
  });
  const normalized = normalizeSvgLight(textified);
  const src = parseSvgSize(normalized);
  const baseW = Math.max(1, Math.floor(src.width * scale));
  const baseH = Math.max(1, Math.floor(src.height * scale));

  await waitFontsForSvg(normalized);

  // 2) 최종 캔버스 크기 결정: 현재 W/H가 목표보다 작으면 가로폭을 늘려 여백 추가
  const curAspect = baseW / baseH;
  const dstW =
    curAspect < targetAspect ? Math.round(baseH * targetAspect) : baseW;
  const dstH = baseH;

  // 3) 네이티브 렌더 우선
  try {
    const blob = new Blob([normalized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const { canvas, ctx } = makeCanvas(dstW, dstH);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, dstW, dstH);

    const img = await loadImage(url);
    const vb = getViewBox(normalized) ?? {
      x: 0,
      y: 0,
      w: src.width,
      h: src.height,
    };
    const { dx, dy, dw, dh } = fitContain(vb.w, vb.h, dstW, dstH);
    ctx.drawImage(
      img,
      Math.round(dx),
      Math.round(dy),
      Math.round(dw),
      Math.round(dh)
    );
    queueMicrotask(() => URL.revokeObjectURL(url));

    const out = await canvasToBlob(canvas, type);
    if (out) trigger(out, filename);
    return;
  } catch {
    // 4) canvg 폴백
    const { canvas, ctx } = makeCanvas(dstW, dstH);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, dstW, dstH);

    // 오프스크린 → Contain 배치
    const off = document.createElement("canvas");
    off.width = baseW;
    off.height = baseH;
    const offCtx = off.getContext("2d");
    if (!offCtx) return;

    const v = await Canvg.from(offCtx, normalized, {
      ignoreDimensions: true,
      ignoreClear: true,
    });
    await v.render();

    const { dx, dy, dw, dh } = fitContain(off.width, off.height, dstW, dstH);
    ctx.drawImage(
      off,
      Math.round(dx),
      Math.round(dy),
      Math.round(dw),
      Math.round(dh)
    );

    const out = await canvasToBlob(canvas, type);
    if (out) trigger(out, filename);
  }
}

/**
 * SVG → PNG/JPG
 * 1) foreignObject → <text> 치환(+ 라벨 배경을 캔버스 배경과 선합성)
 * 2) viewBox/size 보정
 * 3) 폰트 로딩 대기(document.fonts)
 * 4) 네이티브 렌더(SVG→Image→drawImage), 실패 시 canvg 폴백
 */
export async function downloadRasterFromSVG(
  svg: string,
  type: "image/png" | "image/jpeg",
  filename: string,
  scale = 2,
  bg = "#ffffff"
) {
  // A) foreignObject → <text> (정중앙 배치 + 계산된 스타일 인라인) + 선합성
  const textified = foreignObjectToCenteredText(svg, {
    canvasBg: bg,
    precompose: true,
  });

  // B) viewBox/size 보정
  const normalized = normalizeSvgLight(textified);

  // C) 출력 크기
  const size = parseSvgSize(normalized);
  const w = Math.max(1, Math.floor(size.width * scale));
  const h = Math.max(1, Math.floor(size.height * scale));

  // D) 폰트 로딩 대기
  await waitFontsForSvg(normalized);

  // E) 네이티브 렌더 경로
  try {
    const blob = new Blob([normalized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const { canvas, ctx } = makeCanvas(w, h);
    // 배경
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const img = await loadImage(url);

    // viewBox 기준 비율 유지(xMidYMid meet)
    const vb = getViewBox(normalized) ?? {
      x: 0,
      y: 0,
      w: size.width,
      h: size.height,
    };
    const { dx, dy, dw, dh } = fitContain(vb.w, vb.h, w, h);

    // 픽셀 스냅(미세 블러/중앙 오차 방지)
    const sDX = Math.round(dx);
    const sDY = Math.round(dy);
    const sDW = Math.round(dw);
    const sDH = Math.round(dh);

    ctx.drawImage(img, sDX, sDY, sDW, sDH);
    queueMicrotask(() => URL.revokeObjectURL(url));

    const out = await canvasToBlob(canvas, type);
    if (out) trigger(out, filename);
    return;
  } catch {
    // F) 폴백: canvg
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const v = await Canvg.from(ctx, normalized, {
      ignoreDimensions: true,
      ignoreClear: true,
    });
    // 일부 버전에서 resize 제공
    if (typeof (v as any).resize === "function")
      (v as any).resize(w, h, "xMidYMid meet");
    await v.render();

    const out = await canvasToBlob(canvas, type);
    if (out) trigger(out, filename);
  }
}

/* ──────────────────────────
 * utils
 * ────────────────────────── */

function trigger(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context is not supported in this environment.");
  }
  ctx.imageSmoothingEnabled = true;
  // 타입 정의에 없어서 any 캐스팅
  (ctx as any).imageSmoothingQuality = "high";
  return { canvas, ctx };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg"
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, type, type === "image/jpeg" ? 1.0 : undefined)
  );
}

/** viewBox 비율 유지(xMidYMid meet) */
function fitContain(srcW: number, srcH: number, dstW: number, dstH: number) {
  const s = Math.min(dstW / srcW, dstH / srcH);
  const dw = srcW * s;
  const dh = srcH * s;
  const dx = (dstW - dw) / 2;
  const dy = (dstH - dh) / 2;
  return { dx, dy, dw, dh };
}

function parseSvgSize(svg: string): { width: number; height: number } {
  const vb = svg.match(/viewBox\s*=\s*"([\d.\s-]+)"/i);
  if (vb?.[1]) {
    const p = vb[1].trim().split(/\s+/).map(Number);
    if (p.length === 4) return { width: p[2], height: p[3] };
  }
  const w = svg.match(/width\s*=\s*"([\d.]+)(px)?"/i)?.[1];
  const h = svg.match(/height\s*=\s*"([\d.]+)(px)?"/i)?.[1];
  return { width: w ? Number(w) : 800, height: h ? Number(h) : 600 };
}

function getViewBox(
  svg: string
): { x: number; y: number; w: number; h: number } | null {
  const m = svg.match(/viewBox\s*=\s*"([\d.\s-]+)"/i);
  if (!m?.[1]) return null;
  const [x, y, w, h] = m[1].trim().split(/\s+/).map(Number);
  return { x, y, w, h };
}

function normalizeSvgLight(svgString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.documentElement;

  // viewBox 없고 width/height만 있는 경우 보정
  const hasViewBox = svg.hasAttribute("viewBox");
  const widthAttr = svg.getAttribute("width");
  const heightAttr = svg.getAttribute("height");
  if (!hasViewBox && widthAttr && heightAttr) {
    const w = Number(widthAttr.replace("px", ""));
    const h = Number(heightAttr.replace("px", ""));
    if (w > 0 && h > 0) svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }
  if (!svg.getAttribute("width")) svg.setAttribute("width", "800");
  if (!svg.getAttribute("height")) svg.setAttribute("height", "600");

  if (!svg.getAttribute("text-rendering")) {
    svg.setAttribute("text-rendering", "optimizeLegibility");
  }

  return new XMLSerializer().serializeToString(svg);
}

/* ──────────────────────────
 * 폰트 로딩 대기 (lint 안정형)
 * ────────────────────────── */

async function waitFontsForSvg(svgString: string) {
  const families = collectFontFamilies(svgString);
  const promises: Promise<any>[] = [];
  if ("fonts" in document) {
    for (const ff of families) {
      promises.push((document as any).fonts.load(`16px ${ff}`));
    }
    if ((document as any).fonts.ready) {
      promises.push((document as any).fonts.ready);
    }
  }
  await Promise.allSettled(promises);
}

function collectFontFamilies(svg: string): Set<string> {
  const set = new Set<string>();

  // style 속성/태그 내 font-family
  const re = /font-family\s*:\s*([^;"]+)/gi;
  let m: RegExpExecArray | null;
  for (;;) {
    m = re.exec(svg);
    if (!m) break;
    m[1]
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean)
      .forEach((name) => {
        set.add(name);
      });
  }

  // 요소 속성 font-family=""
  const reAttr = /font-family\s*=\s*"([^"]+)"/gi;
  for (;;) {
    m = reAttr.exec(svg);
    if (!m) break;
    m[1]
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean)
      .forEach((name) => {
        set.add(name);
      });
  }

  if (set.size === 0) {
    set.add("system-ui");
    set.add("Arial");
    set.add("sans-serif");
  }
  return set;
}

/* ──────────────────────────
 * 핵심: foreignObject → <text> (정중앙 배치 + 계산된 스타일 인라인)
 *  - 배경은 캔버스 배경과 미리 합성(pre-compose)하여 불투명 색으로 치환
 *  - 가로/세로 중앙: text-anchor="middle", dominant-baseline="middle"
 *  - 멀티라인: tspan으로 중앙 기준 균등 배치
 *  - 위치는 부모 transform 유지(원래 도형 자리)
 * ────────────────────────── */
function foreignObjectToCenteredText(
  svgString: string,
  opts?: { canvasBg?: string; precompose?: boolean }
): string {
  const parser = new DOMParser();
  const srcDoc = parser.parseFromString(svgString, "image/svg+xml");
  const srcSvg = srcDoc.documentElement;

  // 계산된 스타일용 숨김 DOM
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-99999px;top:-99999px;width:0;height:0;overflow:hidden;";
  const shadowDoc = parser.parseFromString(svgString, "image/svg+xml");
  const shadowSvg = shadowDoc.documentElement;
  host.appendChild(shadowSvg);
  document.body.appendChild(host);

  const foList = Array.from(srcSvg.querySelectorAll("foreignObject"));
  const foListShadow = Array.from(shadowSvg.querySelectorAll("foreignObject"));

  const canvasBgHex = cssColorToHex(opts?.canvasBg ?? "#ffffff");
  const doPrecompose = !!opts?.precompose;

  foList.forEach((fo, i) => {
    const foShadow = foListShadow[i];
    if (!foShadow) return;

    const textContent = (foShadow.textContent || "").trim();
    if (!textContent) {
      fo.remove();
      return;
    }

    const inner = foShadow.querySelector("*") as Element | null;
    const cs = inner ? window.getComputedStyle(inner) : null;

    const color = cs?.color || "rgb(0,0,0)";
    const fontFamily =
      cs?.fontFamily ||
      "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    const fontSize = cs?.fontSize || "14px";
    const fontWeight = cs?.fontWeight || "400";

    // 배경/패딩/라운드/테두리
    const bgColorCss = cs?.backgroundColor || "rgba(0,0,0,0)";
    const { hex: bgHex, a: bgAlpha } = cssColorToHexA(bgColorCss);

    const padT = pxNum(cs?.paddingTop, 0);
    const padR = pxNum(cs?.paddingRight, 0);
    const padB = pxNum(cs?.paddingBottom, 0);
    const padL = pxNum(cs?.paddingLeft, 0);

    const radius = pxNum(cs?.borderTopLeftRadius, 0);

    const borderW = pxNum(cs?.borderTopWidth, 0);
    const borderColorCss = cs?.borderTopColor || "rgba(0,0,0,0)";
    const { hex: borderHex, a: borderAlpha } = cssColorToHexA(borderColorCss);

    const width = Number(fo.getAttribute("width") || 0);
    const height = Number(fo.getAttribute("height") || 0);

    // 부모 transform 계승
    const g = srcDoc.createElementNS("http://www.w3.org/2000/svg", "g");
    const tf = fo.getAttribute("transform");
    if (tf) g.setAttribute("transform", tf);

    const textNode = srcDoc.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );

    const fsNum = parseFloat(fontSize) || 14;
    const lineHeight = fsNum * 1.2;

    // 기하학적 중앙 좌표
    const cx = (width || 0) / 2;
    const cy = (height || 0) / 2;

    textNode.setAttribute("x", String(cx));
    textNode.setAttribute("y", String(cy));
    textNode.setAttribute("text-anchor", "middle");
    textNode.setAttribute("dominant-baseline", "middle");

    // 스타일 인라인
    textNode.setAttribute("fill", cssColorToHex(color));
    textNode.setAttribute("font-family", fontFamily);
    textNode.setAttribute("font-size", fontSize);
    textNode.setAttribute("font-weight", fontWeight);
    textNode.setAttribute("opacity", "1");

    // 멀티라인 처리: 중앙 기준 위/아래 균등 분포
    const lines = textContent.split(/\r?\n/).map((s) => s.trim());
    if (lines.length === 1) {
      textNode.textContent = lines[0];
    } else {
      const total = (lines.length - 1) * lineHeight;
      const yStart = cy - total / 2;
      lines.forEach((line, idx) => {
        const tspan = srcDoc.createElementNS(
          "http://www.w3.org/2000/svg",
          "tspan"
        );
        tspan.setAttribute("x", String(cx));
        tspan.setAttribute("y", String(yStart + idx * lineHeight));
        tspan.textContent = line;
        textNode.appendChild(tspan);
      });
    }

    // 텍스트 블록 측정 후 배경 rect 삽입
    {
      const fontForMeasure = `${fontWeight} ${fontSize} ${fontFamily}`;
      const { width: tw, height: th } = measureTextBlock(
        lines.length ? lines : [textNode.textContent || ""],
        fontForMeasure,
        lineHeight
      );

      const bw = tw + padL + padR;
      const bh = th + padT + padB;

      if (bgAlpha > 0 && bw > 0 && bh > 0) {
        const rect = srcDoc.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        rect.setAttribute("x", String(cx - bw / 2));
        rect.setAttribute("y", String(cy - bh / 2));
        rect.setAttribute("width", String(bw));
        rect.setAttribute("height", String(bh));
        if (radius > 0) {
          rect.setAttribute("rx", String(radius));
          rect.setAttribute("ry", String(radius));
        }

        // ▼ 최소 가시성 하한 + 선합성
        const minAlpha = 1;
        const effAlpha = Math.max(bgAlpha, minAlpha);

        let finalFill = bgHex;
        let finalFillOpacity = 1;

        if (doPrecompose && effAlpha < 1) {
          finalFill = blendOver(bgHex, canvasBgHex, effAlpha); // 불투명 색으로 치환
          finalFillOpacity = 1;
        } else {
          finalFillOpacity = effAlpha;
        }

        rect.setAttribute("fill", finalFill);
        rect.setAttribute("opacity", "1");
        if (finalFillOpacity < 1)
          rect.setAttribute("fill-opacity", String(finalFillOpacity));

        // 대비 강화용 테두리(아주 옅게)
        if (borderW > 0 && borderAlpha > 0) {
          rect.setAttribute("stroke", borderHex);
          if (borderAlpha < 1)
            rect.setAttribute("stroke-opacity", String(borderAlpha));
          rect.setAttribute("stroke-width", String(borderW));
        } else {
          rect.setAttribute("stroke", "#000000");
          rect.setAttribute("stroke-opacity", "0.15");
          rect.setAttribute("stroke-width", "1");
        }

        // z-order: 배경 → 텍스트
        g.appendChild(rect);
      }
    }

    g.appendChild(textNode);
    fo.replaceWith(g);
  });

  host.remove();
  return new XMLSerializer().serializeToString(srcSvg);
}

/* 색상 문자열 → hex6 */
function cssColorToHex(input: string): string {
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(input)) return input;
  const m = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (m) {
    const r = Number(m[1]).toString(16).padStart(2, "0");
    const g = Number(m[2]).toString(16).padStart(2, "0");
    const b = Number(m[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  const tmp = document.createElement("div");
  tmp.style.color = input;
  document.body.appendChild(tmp);
  const cs = window.getComputedStyle(tmp).color;
  document.body.removeChild(tmp);
  return cssColorToHex(cs || "#000000");
}

/** px 문자열 → number (기본값 fallback) */
function pxNum(v?: string | null, fallback = 0) {
  if (!v) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

/** CSS color → { hex, a }  (rgba 처리: fill + fill-opacity 분리용) */
function cssColorToHexA(input: string): { hex: string; a: number } {
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(input)) return { hex: input, a: 1 };

  const tmp = document.createElement("div");
  tmp.style.color = input;
  document.body.appendChild(tmp);
  const color = getComputedStyle(tmp).color; // rgb(a)
  document.body.removeChild(tmp);

  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!m) return { hex: "#000000", a: 1 };
  const r = Number(m[1]),
    g = Number(m[2]),
    b = Number(m[3]);
  const a = m[4] !== undefined ? Math.max(0, Math.min(1, Number(m[4]))) : 1;
  const hex = `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  return { hex, a };
}

/** 오프스크린 Canvas로 멀티라인 텍스트 블록 측정 */
function measureTextBlock(lines: string[], font: string, lineHeight: number) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context is not supported in this environment.");
  }
  ctx.font = font;
  let maxW = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxW) maxW = w;
  }
  const height = Math.max(lineHeight, lines.length * lineHeight);
  return { width: Math.ceil(maxW), height: Math.ceil(height) };
}

/* ──────────────── 색상 합성 헬퍼 ──────────────── */
function hexToRgb(hex: string) {
  const s = hex.replace("#", "");
  const arr =
    s.length === 3
      ? s.split("").map((c) => parseInt(c + c, 16))
      : [
          parseInt(s.slice(0, 2), 16),
          parseInt(s.slice(2, 4), 16),
          parseInt(s.slice(4, 6), 16),
        ];
  return { r: arr[0], g: arr[1], b: arr[2] };
}
function rgbToHex(r: number, g: number, b: number) {
  const h = (x: number) =>
    Math.max(0, Math.min(255, Math.round(x)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
/** fg(알파) 를 bg 위에 합성한 불투명 색 */
function blendOver(fgHex: string, bgHex: string, a: number) {
  const fg = hexToRgb(fgHex),
    bg = hexToRgb(bgHex);
  const r = fg.r * a + bg.r * (1 - a);
  const g = fg.g * a + bg.g * (1 - a);
  const b = fg.b * a + bg.b * (1 - a);
  return rgbToHex(r, g, b);
}
