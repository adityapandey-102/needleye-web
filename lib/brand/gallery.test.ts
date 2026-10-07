import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { altFromFileName, loadBrandPhotos } from "./gallery";

let dir = "";
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = "";
});

describe("loadBrandPhotos", () => {
  it("lists only images, in natural file-name order, with readable alt text", () => {
    dir = mkdtempSync(path.join(tmpdir(), "brand-"));
    for (const f of ["10-sherwani.webp", "2-festive_anarkali.png", "1-bridal-lehenga.jpg", "notes.txt", ".DS_Store"]) writeFileSync(path.join(dir, f), "x");
    expect(loadBrandPhotos(dir)).toEqual([
      { src: "/brand/1-bridal-lehenga.jpg", alt: "Bridal lehenga by Needleye" },
      { src: "/brand/2-festive_anarkali.png", alt: "Festive anarkali by Needleye" },
      { src: "/brand/10-sherwani.webp", alt: "Sherwani by Needleye" },
    ]);
  });

  it("returns nothing (so the page shows swatches) when the folder is missing", () => {
    expect(loadBrandPhotos(path.join(tmpdir(), "does-not-exist-needleye"))).toEqual([]);
  });
});

describe("altFromFileName", () => {
  it("falls back when the name is only a number", () => {
    expect(altFromFileName("07.jpg")).toBe("A Needleye design");
  });
});
