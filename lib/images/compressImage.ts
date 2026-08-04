/**
 * Client-side image compression, WhatsApp-style: downscale the longest edge and
 * re-encode as JPEG before upload. Boutique staff photograph fabric/designs on
 * phones (often 4-12 MP, several MB each) but the app only ever displays these
 * as small reference thumbnails — shipping the full-resolution original wastes
 * the client's bandwidth and Supabase Storage/egress budget (the one real cost
 * driver at this scale). Doing it here, not on the API, means the big file
 * never leaves the device.
 *
 * Safe by construction: anything that isn't a raster image, can't be decoded,
 * or wouldn't actually get smaller is passed through unchanged, so a failure
 * degrades to "upload the original", never to a broken upload.
 */
export interface CompressOptions {
  /** Longest-edge cap in pixels. Larger images are scaled down to fit; smaller ones are left as-is. */
  maxEdge?: number;
  /** JPEG quality, 0-1. */
  quality?: number;
}

const DEFAULTS: Required<CompressOptions> = { maxEdge: 1600, quality: 0.8 };

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const { maxEdge, quality } = { ...DEFAULTS, ...options };

  // Only raster images are compressible here. GIFs (possibly animated) and SVGs
  // (vector) would be corrupted by a canvas JPEG round-trip, so skip them.
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    // Fall back to the original if encoding failed, or if it didn't actually
    // shrink (e.g. an already-small, already-optimized JPEG being re-encoded).
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^./\\]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Decode/toBlob can throw (e.g. a corrupt file or a tainted canvas) — never
    // let that block the upload; just send the original.
    return file;
  }
}
