import { readdirSync } from "node:fs";
import path from "node:path";

export interface BrandPhoto {
  src: string;
  alt: string;
}

const PHOTO_FILE = /\.(jpe?g|png|webp|avif)$/i;

/**
 * The enquiry page's design photos: every image in `public/brand/`, in file-name
 * order (name them 01-bridal.jpg, 02-festive.jpg, ... to set the order; the
 * name, minus number and extension, becomes the alt text). Read on the server
 * at build time -- drop photos in the folder and redeploy, no code change.
 * An empty or missing folder returns [] and the page shows fabric swatches.
 */
export function loadBrandPhotos(dir = path.join(process.cwd(), "public", "brand")): BrandPhoto[] {
  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    return [];
  }
  return files
    .filter((f) => PHOTO_FILE.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => ({ src: `/brand/${encodeURIComponent(file)}`, alt: altFromFileName(file) }));
}

/** "03-red-bridal-lehenga.jpg" -> "Red bridal lehenga by Needleye". */
export function altFromFileName(file: string): string {
  const words = file
    .replace(PHOTO_FILE, "")
    .replace(/^\d+[-_\s]*/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)} by Needleye` : "A Needleye design";
}
