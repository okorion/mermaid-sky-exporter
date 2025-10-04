export async function downloadSVG(svg: string, filename = "diagram.svg") {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  trigger(blob, filename);
}

export async function downloadRasterFromSVG(
  svg: string,
  type: "image/png" | "image/jpeg",
  filename: string,
  scale = 2,
  bg = "#ffffff"
) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        trigger(blob!, filename);
        URL.revokeObjectURL(url);
      },
      type,
      type === "image/jpeg" ? 0.92 : undefined
    );
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

function trigger(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
