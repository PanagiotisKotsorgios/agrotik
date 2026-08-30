/**
 * Read a File and produce a resized JPEG data URL that fits within
 * `maxSize` on the longest side. Runs in the browser (canvas).
 */
export async function fileToResizedDataUrl(
  file: File,
  maxSize = 720,
  quality = 0.82,
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Δεν είναι εικόνα");
  const img = document.createElement("img");
  const src = URL.createObjectURL(file);
  try {
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Αδυναμία ανάγνωσης εικόνας"));
      img.src = src;
    });
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Αδυναμία επεξεργασίας");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(src);
  }
}
