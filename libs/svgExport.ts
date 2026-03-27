// libs/svgExport.ts
import { Canvg } from "canvg";

/** Export SVG as-is. */
export async function downloadSVG(svg: string, filename = "diagram.svg") {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  trigger(blob, buildExportFilename(filename, "svg"));
}

/** Export a raster image while fitting the diagram into a wider target aspect ratio. */
export async function downloadRasterForAspect(
  svg: string,
  filename: string,
  type: "image/png" | "image/jpeg",
  opts: {
    aspect: number;
    scale?: number;
    background?: string;
  }
) {
  const scale = normalizeScale(opts.scale, 2);
  const bg = opts.background ?? "#ffffff";
  const targetAspect = normalizeAspect(opts.aspect, 1);

  const textified = foreignObjectToCenteredText(svg, {
    canvasBg: bg,
    precompose: true,
  });
  const normalized = normalizeSvgLight(textified);
  const src = parseSvgSize(normalized);
  const baseW = Math.max(1, Math.floor(src.width * scale));
  const baseH = Math.max(1, Math.floor(src.height * scale));

  await waitFontsForSvg(normalized);

  const curAspect = baseW / baseH;
  const dstW =
    curAspect < targetAspect ? Math.round(baseH * targetAspect) : baseW;
  const dstH = baseH;

  try {
    const blob = new Blob([normalized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    try {
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
      if (dw > 0 && dh > 0) {
        ctx.drawImage(
          img,
          Math.round(dx),
          Math.round(dy),
          Math.round(dw),
          Math.round(dh)
        );
      }

      const out = await canvasToBlob(canvas, type);
      if (out) trigger(out, buildExportFilename(filename, fileExtension(type)));
      return;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    const { canvas, ctx } = makeCanvas(dstW, dstH);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, dstW, dstH);

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
    if (dw > 0 && dh > 0) {
      ctx.drawImage(
        off,
        Math.round(dx),
        Math.round(dy),
        Math.round(dw),
        Math.round(dh)
      );
    }

    const out = await canvasToBlob(canvas, type);
    if (out) trigger(out, buildExportFilename(filename, fileExtension(type)));
  }
}

/** Export a raster image using the original diagram aspect ratio. */
export async function downloadRasterFromSVG(
  svg: string,
  type: "image/png" | "image/jpeg",
  filename: string,
  scale = 2,
  bg = "#ffffff"
) {
  const effectiveScale = normalizeScale(scale, 2);
  const textified = foreignObjectToCenteredText(svg, {
    canvasBg: bg,
    precompose: true,
  });
  const normalized = normalizeSvgLight(textified);

  const size = parseSvgSize(normalized);
  const w = Math.max(1, Math.floor(size.width * effectiveScale));
  const h = Math.max(1, Math.floor(size.height * effectiveScale));

  await waitFontsForSvg(normalized);

  try {
    const blob = new Blob([normalized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    try {
      const { canvas, ctx } = makeCanvas(w, h);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const img = await loadImage(url);
      const vb = getViewBox(normalized) ?? {
        x: 0,
        y: 0,
        w: size.width,
        h: size.height,
      };
      const { dx, dy, dw, dh } = fitContain(vb.w, vb.h, w, h);
      if (dw > 0 && dh > 0) {
        ctx.drawImage(
          img,
          Math.round(dx),
          Math.round(dy),
          Math.round(dw),
          Math.round(dh)
        );
      }

      const out = await canvasToBlob(canvas, type);
      if (out) trigger(out, buildExportFilename(filename, fileExtension(type)));
      return;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const v = await Canvg.from(ctx, normalized, {
      ignoreDimensions: true,
      ignoreClear: true,
    });
    if (typeof (v as any).resize === "function") {
      (v as any).resize(w, h, "xMidYMid meet");
    }
    await v.render();

    const out = await canvasToBlob(canvas, type);
    if (out) trigger(out, buildExportFilename(filename, fileExtension(type)));
  }
}

function trigger(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function buildExportFilename(input: string, extension: string) {
  const base = stripKnownExtension(sanitizeFilename(input)).replace(/[. ]+$/g, "");
  const ext = extension.replace(/^\./, "").toLowerCase();
  return `${base || "diagram"}.${ext}`;
}

function sanitizeFilename(input: string) {
  const fallback = "diagram";
  const cleaned = input
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "");
  return cleaned || fallback;
}

function stripKnownExtension(input: string) {
  return input.replace(/\.(svg|png|jpe?g)$/i, "");
}

function fileExtension(type: "image/png" | "image/jpeg") {
  return type === "image/png" ? "png" : "jpg";
}

function normalizeScale(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Math.max(0.1, value ?? fallback) : fallback;
}

function normalizeAspect(value: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(0.1, value) : fallback;
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

function fitContain(srcW: number, srcH: number, dstW: number, dstH: number) {
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) {
    return { dx: 0, dy: 0, dw: 0, dh: 0 };
  }
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
    if (p.length === 4 && p[2] > 0 && p[3] > 0) {
      return { width: p[2], height: p[3] };
    }
  }
  const w = svg.match(/width\s*=\s*"([\d.]+)(px)?"/i)?.[1];
  const h = svg.match(/height\s*=\s*"([\d.]+)(px)?"/i)?.[1];
  const width = w ? Number(w) : 800;
  const height = h ? Number(h) : 600;
  return {
    width: Number.isFinite(width) && width > 0 ? width : 800,
    height: Number.isFinite(height) && height > 0 ? height : 600,
  };
}

function getViewBox(
  svg: string
): { x: number; y: number; w: number; h: number } | null {
  const m = svg.match(/viewBox\s*=\s*"([\d.\s-]+)"/i);
  if (!m?.[1]) return null;
  const [x, y, w, h] = m[1].trim().split(/\s+/).map(Number);
  if (![x, y, w, h].every((v) => Number.isFinite(v))) return null;
  return { x, y, w, h };
}

function normalizeSvgLight(svgString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.documentElement;

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

async function waitFontsForSvg(svgString: string) {
  const families = collectFontFamilies(svgString);
  const promises: Promise<unknown>[] = [];
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

  const re = /font-family\s*:\s*([^;"]+)/gi;
  let m: RegExpExecArray | null;
  for (;;) {
    m = re.exec(svg);
    if (!m) break;
    m[1]
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean)
      .forEach((name) => set.add(name));
  }

  const reAttr = /font-family\s*=\s*"([^"]+)"/gi;
  for (;;) {
    m = reAttr.exec(svg);
    if (!m) break;
    m[1]
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean)
      .forEach((name) => set.add(name));
  }

  if (set.size === 0) {
    set.add("system-ui");
    set.add("Arial");
    set.add("sans-serif");
  }
  return set;
}

function foreignObjectToCenteredText(
  svgString: string,
  opts?: { canvasBg?: string; precompose?: boolean }
): string {
  const parser = new DOMParser();
  const srcDoc = parser.parseFromString(svgString, "image/svg+xml");
  const srcSvg = srcDoc.documentElement;

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-99999px;top:-99999px;width:0;height:0;overflow:hidden;";
  const shadowDoc = parser.parseFromString(svgString, "image/svg+xml");
  const shadowSvg = shadowDoc.documentElement;
  host.appendChild(shadowSvg);
  document.body.appendChild(host);

  try {
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
      const g = srcDoc.createElementNS("http://www.w3.org/2000/svg", "g");
      const tf = fo.getAttribute("transform");
      if (tf) g.setAttribute("transform", tf);

      const textNode = srcDoc.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      const fsNum = parseFloat(fontSize) || 14;
      const lineHeight = fsNum * 1.2;
      const cx = width / 2;
      const cy = height / 2;

      textNode.setAttribute("x", String(cx));
      textNode.setAttribute("y", String(cy));
      textNode.setAttribute("text-anchor", "middle");
      textNode.setAttribute("dominant-baseline", "middle");
      textNode.setAttribute("fill", cssColorToHex(color));
      textNode.setAttribute("font-family", fontFamily);
      textNode.setAttribute("font-size", fontSize);
      textNode.setAttribute("font-weight", fontWeight);
      textNode.setAttribute("opacity", "1");

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

        const minAlpha = 1;
        const effAlpha = Math.max(bgAlpha, minAlpha);
        let finalFill = bgHex;
        let finalFillOpacity = 1;

        if (doPrecompose && effAlpha < 1) {
          finalFill = blendOver(bgHex, canvasBgHex, effAlpha);
          finalFillOpacity = 1;
        } else {
          finalFillOpacity = effAlpha;
        }

        rect.setAttribute("fill", finalFill);
        rect.setAttribute("opacity", "1");
        if (finalFillOpacity < 1) {
          rect.setAttribute("fill-opacity", String(finalFillOpacity));
        }

        if (borderW > 0 && borderAlpha > 0) {
          rect.setAttribute("stroke", borderHex);
          if (borderAlpha < 1) {
            rect.setAttribute("stroke-opacity", String(borderAlpha));
          }
          rect.setAttribute("stroke-width", String(borderW));
        } else {
          rect.setAttribute("stroke", "#000000");
          rect.setAttribute("stroke-opacity", "0.15");
          rect.setAttribute("stroke-width", "1");
        }

        g.appendChild(rect);
      }

      g.appendChild(textNode);
      fo.replaceWith(g);
    });

    return new XMLSerializer().serializeToString(srcSvg);
  } finally {
    host.remove();
  }
}

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

function pxNum(v?: string | null, fallback = 0) {
  if (!v) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function cssColorToHexA(input: string): { hex: string; a: number } {
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(input)) return { hex: input, a: 1 };

  const tmp = document.createElement("div");
  tmp.style.color = input;
  document.body.appendChild(tmp);
  const color = getComputedStyle(tmp).color;
  document.body.removeChild(tmp);

  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!m) return { hex: "#000000", a: 1 };
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  const a = m[4] !== undefined ? Math.max(0, Math.min(1, Number(m[4]))) : 1;
  const hex = `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  return { hex, a };
}

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

function blendOver(fgHex: string, bgHex: string, a: number) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const r = fg.r * a + bg.r * (1 - a);
  const g = fg.g * a + bg.g * (1 - a);
  const b = fg.b * a + bg.b * (1 - a);
  return rgbToHex(r, g, b);
}
