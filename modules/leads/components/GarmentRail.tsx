import Image from "next/image";
import type { BrandPhoto } from "../../../lib/brand/gallery";

/**
 * The enquiry page's signature: Needleye designs gliding past like garments on
 * an atelier rail. Pure CSS (globals.css .rail-*), no JavaScript -- each track
 * renders its items twice and moves half its length, so it loops seamlessly.
 * Without photos in public/brand it shows woven fabric swatches instead.
 */

const SWATCHES = [
  { name: "Bridal lehenga", cls: "swatch-zari", ink: "text-gold-soft" },
  { name: "Festive anarkali", cls: "swatch-ivory", ink: "text-primary" },
  { name: "Reception gown", cls: "swatch-silk", ink: "text-gold-soft" },
  { name: "Saree blouse", cls: "swatch-gold", ink: "text-white" },
  { name: "Sherwani", cls: "swatch-silk", ink: "text-gold-soft" },
  { name: "Indo-western", cls: "swatch-ivory", ink: "text-primary" },
  { name: "Kurta set", cls: "swatch-zari", ink: "text-gold-soft" },
  { name: "Custom design", cls: "swatch-gold", ink: "text-white" },
];

type Tile = { kind: "photo"; photo: BrandPhoto } | { kind: "swatch"; swatch: (typeof SWATCHES)[number] };

/** Enough tiles to fill a track: real photos (repeated if there are few), else the swatches. */
function tilesFrom(photos: BrandPhoto[], min: number): Tile[] {
  const base: Tile[] = photos.length > 0 ? photos.map((photo) => ({ kind: "photo", photo })) : SWATCHES.map((swatch) => ({ kind: "swatch", swatch }));
  const out: Tile[] = [];
  while (out.length < min) out.push(...base);
  return out;
}

function TileView({ tile, className, sizes, eager }: { tile: Tile; className: string; sizes: string; eager?: boolean }) {
  if (tile.kind === "photo") {
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-[3px] ring-1 ring-gold-light/25 ${className}`}>
        <Image src={tile.photo.src} alt={tile.photo.alt} fill sizes={sizes} className="object-cover" loading={eager ? "eager" : "lazy"} />
      </div>
    );
  }
  return (
    <div className={`relative flex shrink-0 items-end overflow-hidden rounded-[3px] ring-1 ring-gold-light/25 ${tile.swatch.cls} ${className}`} aria-hidden>
      <span className={`p-3 font-serif text-[15px] leading-tight italic ${tile.swatch.ink}`}>{tile.swatch.name}</span>
    </div>
  );
}

/**
 * Desktop: three columns gliding in opposite directions (the middle one down,
 * a touch slower), a gold tacking stitch between them.
 */
export function GarmentRailColumns({ photos }: { photos: BrandPhoto[] }) {
  const tiles = tilesFrom(photos, 9);
  const columns = [0, 1, 2].map((c) => tiles.filter((_, i) => i % 3 === c));
  const column = (items: Tile[], dir: "rail-up" | "rail-down", duration: string) => (
    <div className="min-w-0 flex-1 overflow-hidden">
      <div className={`${dir} flex flex-col gap-4`} style={{ animationDuration: duration }}>
        {[...items, ...items].map((t, i) => (
          <TileView key={i} tile={t} className="aspect-[3/4] w-full" sizes="(min-width: 1024px) 15vw, 1px" eager={i < 2} />
        ))}
      </div>
    </div>
  );
  return (
    <div className="rail-hold rail-fade-y flex h-full gap-4" role="img" aria-label="Needle Eye designs">
      {column(columns[0]!, "rail-up", "80s")}
      <div className="stitch-rule-v w-px shrink-0 opacity-70" aria-hidden />
      {column(columns[1]!, "rail-down", "95s")}
      <div className="stitch-rule-v w-px shrink-0 opacity-70" aria-hidden />
      {column(columns[2]!, "rail-up", "88s")}
    </div>
  );
}

/** Phones: one slim strip sliding sideways -- small tiles, one transform, light on battery. */
export function GarmentRailStrip({ photos }: { photos: BrandPhoto[] }) {
  const tiles = tilesFrom(photos, 6);
  return (
    <div className="rail-hold rail-fade-x overflow-hidden" role="img" aria-label="Needle Eye designs">
      <div className="rail-strip flex w-max gap-3">
        {[...tiles, ...tiles].map((t, i) => (
          <TileView key={i} tile={t} className="h-44 w-32" sizes="128px" eager={i < 3} />
        ))}
      </div>
    </div>
  );
}
