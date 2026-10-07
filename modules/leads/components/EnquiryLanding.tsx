import Image from "next/image";
import type { BrandPhoto } from "../../../lib/brand/gallery";
import { EnquiryForm } from "./EnquiryForm";
import { GarmentRailColumns, GarmentRailStrip } from "./GarmentRail";

export const INSTAGRAM_URL = "https://www.instagram.com/needleeye_bangalore/";

const OFFERS = [
  {
    title: "Bridal couture",
    body: "Lehengas, bridal blouses and reception gowns, designed around you and fitted until they're right.",
  },
  {
    title: "Festive and occasion wear",
    body: "Anarkalis, sarees and Indo-western looks for every celebration, and sherwanis and kurta sets for the men of the family.",
  },
  {
    title: "Blouses and embroidery",
    body: "Saree and lehenga blouses in silk, velvet and organza, finished with thread, 3D and hand embroidery.",
  },
  {
    title: "Made from your idea",
    body: "Bring a sketch, a reference or just the occasion. We design it with you and stitch it in our atelier.",
  },
];

const STEPS = [
  { title: "Tell us what you'd like", body: "Send the enquiry on this page. It takes a minute." },
  { title: "We call you back", body: "Usually within a day, to talk about the occasion, your budget and dates." },
  { title: "Consultation and measurements", body: "Meet our designers, choose fabrics and finalise the design." },
  { title: "Stitched in our atelier", body: "Your outfit is made by hand, with fittings until it fits perfectly." },
];

/**
 * The public enquiry page as a Needleye brand page: who Needleye is and what it
 * makes, its designs on the moving garment rail, and the enquiry form as the
 * one thing to do. Server-rendered; the only client code is the form itself.
 */
export function EnquiryLanding({ photos }: { photos: BrandPhoto[] }) {
  return (
    <div className="min-h-screen bg-app-bg text-text-primary">
      <section className="lg:flex lg:h-screen lg:min-h-[44rem]">
        {/* Wine panel: the brand, and its designs on the rail. */}
        <div className="bg-[#3a0d18] text-white lg:flex lg:w-[60%]">
          <div className="flex flex-col px-6 pt-10 pb-8 sm:px-10 lg:w-[52%] lg:justify-between lg:px-14 lg:py-14">
            <div>
              <Image
                src="/Needleye-logo.png"
                alt="Needleye by Sakina Ahmed"
                width={176}
                height={176}
                priority
                className="animate-scale-in h-28 w-28 rounded-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-gold-light/40 sm:h-36 sm:w-36 lg:h-44 lg:w-44"
              />
              <h1 className="animate-rise mt-8 font-serif text-[56px] leading-[0.95] font-semibold tracking-tight sm:text-[72px] lg:text-[88px]">Needleye</h1>
              <p className="animate-rise mt-3 font-serif text-[22px] text-gold-light italic sm:text-[26px]">by Sakina Ahmed</p>
              <div className="stitch-rule mt-7 w-36" aria-hidden />
              <p className="mt-7 max-w-[30ch] text-[17px] leading-relaxed text-white/80">
                Couture made to your measure in Bangalore. Bridal, festive and occasion wear, designed with you and stitched by hand in our
                atelier.
              </p>
            </div>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 hidden w-fit items-center gap-2 text-sm text-gold-light/90 underline-offset-4 hover:text-gold-light hover:underline lg:inline-flex"
            >
              <InstagramGlyph /> See our latest work on Instagram
            </a>
          </div>

          {/* Desktop rail. */}
          <div className="hidden py-6 pr-8 lg:block lg:w-[48%]">
            <GarmentRailColumns photos={photos} />
          </div>
          {/* Phone strip. */}
          <div className="pb-10 lg:hidden">
            <GarmentRailStrip photos={photos} />
          </div>
        </div>

        {/* The form: the one thing to do. */}
        <div id="enquiry" className="flex scroll-mt-6 items-center justify-center px-4 pt-10 pb-12 sm:px-10 lg:w-[40%] lg:py-10">
          <div className="w-full max-w-md rounded-[10px] border border-gold/25 bg-card p-7 shadow-[0_24px_60px_-28px_rgba(58,13,24,0.45)] sm:p-8">
            <EnquiryForm />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:py-24">
        <h2 className="font-serif text-[34px] leading-tight font-semibold sm:text-[42px]">What we make</h2>
        <div className="stitch-rule mt-4 w-24" aria-hidden />
        <dl className="mt-10 grid gap-x-14 gap-y-10 sm:grid-cols-2">
          {OFFERS.map((o) => (
            <div key={o.title} className="border-t border-gold/30 pt-5">
              <dt className="font-serif text-[22px] font-semibold text-primary">{o.title}</dt>
              <dd className="mt-2 max-w-[46ch] text-[15px] leading-relaxed text-text-secondary">{o.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 sm:px-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-24">
        <Image
          src="/studio/needleye-studio.webp"
          alt="The fabric library and seating at the Needleye studio"
          width={1400}
          height={934}
          sizes="(min-width: 1024px) 560px, 100vw"
          className="h-auto w-full rounded-[8px] shadow-[0_24px_60px_-30px_rgba(58,13,24,0.55)] ring-1 ring-gold/25"
        />
        <div>
          <h2 className="font-serif text-[34px] leading-tight font-semibold sm:text-[42px]">Our studio</h2>
          <div className="stitch-rule mt-4 w-24" aria-hidden />
          <p className="mt-6 max-w-[46ch] text-[16px] leading-relaxed text-text-secondary">
            Choose your fabric from the shelves of our studio in Bangalore, with a designer beside you. Silks, velvets, organzas and
            embroidered pieces, matched to the occasion and to you.
          </p>
          <a href="#enquiry" className="mt-7 inline-flex items-center rounded-[6px] bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
            Send an enquiry
          </a>
        </div>
      </section>

      <section className="bg-card/70">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:py-20">
          <h2 className="font-serif text-[34px] leading-tight font-semibold sm:text-[42px]">From enquiry to fitting</h2>
          <div className="stitch-rule mt-4 w-24" aria-hidden />
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="font-serif text-[44px] leading-none text-gold" aria-hidden>
                  {i + 1}
                </span>
                <h3 className="mt-3 text-[16px] font-semibold text-text-primary">{s.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-text-secondary">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="bg-[#3a0d18] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <p className="font-serif text-[28px] leading-none">Needleye</p>
            <p className="mt-1.5 font-serif text-[15px] text-gold-light italic">by Sakina Ahmed, Bangalore</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[6px] border border-gold-light/40 px-4 py-2.5 text-sm text-white/90 transition-colors hover:border-gold-light hover:text-white"
            >
              <InstagramGlyph /> @needleeye_bangalore
            </a>
            <a href="#enquiry" className="inline-flex items-center rounded-[6px] bg-gold px-4 py-2.5 text-sm font-semibold text-[#2c0e18] transition-colors hover:bg-gold-light">
              Send an enquiry
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** A simple outline camera-square, standing in for the Instagram mark. */
function InstagramGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" />
    </svg>
  );
}
