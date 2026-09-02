/**
 * Read a File and produce a resized JPEG data URL that fits within
 * `maxSize` on the longest side. Runs in the browser (canvas).
 */
export async function fileToResizedDataUrl(
  file: File,
  maxSize = 720,
  quality = 0.82,
): Promise<string> {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(file.type)) throw new Error("Επίλεξε εικόνα JPG, PNG ή WebP");
  if (file.size > 10 * 1024 * 1024) throw new Error("Η εικόνα πρέπει να είναι μικρότερη από 10 MB");
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

/**
 * Store resized profile media outside the profiles row. During a rolling
 * deployment, installations that do not have the bucket yet keep the existing
 * data-URL behaviour, so uploads do not suddenly stop working.
 */
export async function uploadProfileImage(
  dataUrl: string,
  kind: "avatar" | "cover" | "gallery",
): Promise<string> {
  const { createSupabaseBrowser } = await import("@/lib/supabase/browser");
  const supabase = createSupabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Απαιτείται σύνδεση");

  const blob = await fetch(dataUrl).then((response) => response.blob());
  const path = `${user.id}/${kind}-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("profile-media").upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });

  // Backwards compatibility until the additive storage migration is applied.
  if (error) {
    console.warn("[profile media storage fallback]", error.message);
    return dataUrl;
  }
  return supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
}
