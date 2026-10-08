import Image from "next/image";
import type { BrandPhoto } from "../../../lib/brand/gallery";
import { BRAND, COLLECTIONS, CONTACT, FABRICS, PROCESS, SOCIAL, STORY, TESTIMONIALS } from "../content/needleEye";
import { EnquiryForm } from "./EnquiryForm";
import { GarmentRailColumns, GarmentRailStrip } from "./GarmentRail";

export const INSTAGRAM_URL = SOCIAL.instagram.href;

/** A preferred photo by file name, else the n-th photo -- so swapping photos in public/brand never breaks the page. */
function pick(photos: BrandPhoto[], file: string, fallbackIndex: number): BrandPhoto | undefined {
  return photos.find((p) => p.src.endsWith(`/${encodeURIComponent(file)}`)) ?? photos[fallbackIndex % Math.max(photos.length, 1)];
}

/**
 * The public enquiry page, as Needle Eye's couture house page: noir, ivory and
 * champagne gold (the .lux theme in globals.css), the shop's real photos and
 * words (content/needleEye.ts), and the enquiry form in the first view.
 * Server-rendered; the only client code is the form itself.
 */
export function EnquiryLanding({ photos }: { photos: BrandPhoto[] }) {
  const atelierPhoto = pick(photos, "06-aqua-brocade-saree-with-embroidered-blouse.webp", 5);
  const visitPhoto = pick(photos, "04-ivory-and-red-silk-saree.webp", 3);

  return (
    <div className="lux min-h-screen bg-[var(--lux-ivory)] text-[var(--lux-ink)]">
      {/* ---------------- Hero: the house, its work on the rail, and the form ---------------- */}
      <section id="top" className="relative overflow-hidden bg-[var(--lux-noir)] text-[var(--lux-ivory)]">
        <div aria-hidden className="lux-glow absolute inset-0" />
        <div aria-hidden className="lux-grain absolute inset-0" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-10">
          <a href="#top" className="flex items-center gap-3" aria-label={`${BRAND.name} ${BRAND.byline}`}>
            <span aria-hidden className="lux-monogram block h-9 w-16 shrink-0" />
            <span className="leading-none">
              <span className="block font-serif text-[19px] tracking-[0.2em] uppercase">{BRAND.name}</span>
              <span className="mt-1 block font-serif text-[12px] text-[var(--lux-gold-light)] italic">{BRAND.byline}</span>
            </span>
          </a>
          <nav aria-label="Sections" className="hidden items-center gap-7 text-[13px] tracking-wide text-white/70 md:flex">
            <a href="#atelier" className="transition-colors hover:text-[var(--lux-gold-light)]">
              Atelier
            </a>
            <a href="#collections" className="transition-colors hover:text-[var(--lux-gold-light)]">
              Collections
            </a>
            <a href="#process" className="transition-colors hover:text-[var(--lux-gold-light)]">
              Process
            </a>
            <a href="#visit" className="transition-colors hover:text-[var(--lux-gold-light)]">
              Visit
            </a>
          </nav>
          <a href="#enquiry" className="lux-btn-gold shrink-0 !px-4 !py-2 text-[13px] whitespace-nowrap sm:!px-5 sm:!py-2.5">
            <span className="sm:hidden">Enquire</span>
            <span className="hidden sm:inline">Book a consultation</span>
          </a>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-x-10 gap-y-10 px-5 pt-6 pb-14 sm:px-10 lg:grid-cols-12 lg:pt-8 lg:pb-20">
          {/* Words */}
          <div className="lg:col-span-5">
            <p className="lux-eyebrow text-[var(--lux-gold)]">Bridal couture · {BRAND.city}</p>
            <h1 className="animate-rise mt-5 font-serif text-[46px] leading-[1.02] font-semibold sm:text-[60px] xl:text-[72px]">
              Beauty finds <span className="lux-gold-text italic">its form</span>
            </h1>
            <div className="lux-hairline mt-7 w-40" aria-hidden />
            <p className="mt-7 max-w-[40ch] text-[17px] leading-relaxed text-[var(--lux-muted-dark)]">
              Bridal sarees, blouses and lehengas, designed with you and embroidered by hand, at our studio near Commercial Street.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#enquiry" className="lux-btn-gold">
                Book a consultation
              </a>
              <a href={CONTACT.phoneHref} className="lux-btn-ghost">
                <PhoneGlyph /> {CONTACT.phoneDisplay}
              </a>
            </div>
            <p className="mt-8 max-w-[44ch] text-[13px] leading-relaxed text-white/55">
              Dressing clients in India, the Middle East, Europe, the United States and South-East Asia.
            </p>
          </div>

          {/* The garment rail: desktop columns, phone strip */}
          <div className="hidden h-[36rem] lg:col-span-3 lg:block">
            <GarmentRailColumns photos={photos} />
          </div>
          <div className="-mx-5 sm:-mx-10 lg:hidden">
            <GarmentRailStrip photos={photos} />
          </div>

          {/* The form: the one thing to do */}
          <div id="enquiry" className="scroll-mt-6 lg:col-span-4">
            <div className="relative rounded-[20px] bg-[var(--lux-ivory)] p-6 text-[var(--lux-ink)] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)] ring-1 ring-[rgba(232,213,166,0.4)] sm:p-8">
              <p className="lux-eyebrow mb-4 text-[var(--lux-gold-deep)]">Private consultation</p>
              <EnquiryForm />
              <p className="mt-5 border-t border-[rgba(122,92,40,0.18)] pt-4 text-[12.5px] text-[var(--lux-muted-light)]">
                Prefer to talk?{" "}
                <a href={CONTACT.phoneHref} className="font-semibold text-[var(--lux-gold-deep)] underline-offset-4 hover:underline">
                  Call {CONTACT.phoneDisplay}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- The atelier: Sakina's story ---------------- */}
      <section id="atelier" className="scroll-mt-4">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:py-28">
          {atelierPhoto && (
            <div className="lux-frame lux-zoom relative aspect-[4/5] overflow-hidden rounded-[4px] shadow-[0_40px_80px_-40px_rgba(29,21,18,0.6)]">
              <Image src={atelierPhoto.src} alt={atelierPhoto.alt} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover object-top" />
            </div>
          )}
          <div>
            <p className="lux-eyebrow text-[var(--lux-gold-deep)]">The atelier</p>
            <h2 className="mt-4 font-serif text-[34px] leading-[1.12] font-semibold sm:text-[44px]">{STORY.heading}</h2>
            <div className="lux-hairline mt-6 w-32" aria-hidden />
            {STORY.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="mt-6 max-w-[54ch] text-[16px] leading-[1.8] text-[var(--lux-muted-light)]">
                {p}
              </p>
            ))}
            <figure className="mt-9 border-l-2 border-[var(--lux-gold)] pl-6">
              <blockquote className="font-serif text-[20px] leading-relaxed text-[var(--lux-ink)] italic">&ldquo;{STORY.quote}&rdquo;</blockquote>
              <figcaption className="lux-eyebrow mt-4 text-[var(--lux-gold-deep)]">{STORY.quoteBy}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ---------------- Collections ---------------- */}
      <section id="collections" className="relative scroll-mt-4 overflow-hidden bg-[var(--lux-noir)] text-[var(--lux-ivory)]">
        <div aria-hidden className="lux-grain absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-10 lg:py-28">
          <SectionTitle eyebrow="Bridal collections" title="Made for you, and only you" dark />
          <p className="mt-6 max-w-[60ch] text-[16px] leading-relaxed text-[var(--lux-muted-dark)]">
            From traditional classics to contemporary pieces: a regal bridal look, a graceful saree, a lehenga or a blouse, each made around your
            ideas, your style and your measurements.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {COLLECTIONS.map((c, i) => {
              const photo = pick(photos, c.photo, i);
              return (
                <article key={c.title} className="lux-zoom group relative aspect-[3/4] overflow-hidden rounded-[4px] bg-[var(--lux-noir-2)] ring-1 ring-[rgba(232,213,166,0.18)]">
                  {photo && (
                    <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw" className="object-cover object-top" />
                  )}
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(13,9,8,0.92)] via-[rgba(13,9,8,0.25)] to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-serif text-[22px] leading-tight font-semibold text-white">{c.title}</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-white/75">{c.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- Gallery ---------------- */}
      {photos.length > 0 && (
        <section aria-labelledby="gallery-title" className="mx-auto max-w-7xl px-5 py-20 sm:px-10 lg:py-28">
          <SectionTitle id="gallery-title" eyebrow="Our brides" title="Worn on their most beautiful days" />
          <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {photos.map((p) => (
              <figure key={p.src} className="lux-zoom relative aspect-[3/4] overflow-hidden rounded-[3px] bg-[var(--lux-champagne)]">
                <Image src={p.src} alt={p.alt} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-top" />
                <figcaption className="sr-only">{p.alt}</figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a href={SOCIAL.instagram.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--lux-gold-deep)] underline-offset-4 hover:underline">
              <InstagramGlyph /> See more on Instagram · {SOCIAL.instagram.label}
            </a>
          </div>
        </section>
      )}

      {/* ---------------- Fabrics + the studio ---------------- */}
      <section className="bg-[var(--lux-champagne)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-10 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <div>
              <SectionTitle eyebrow="Signature fabrics" title="Chosen in our studio, with a designer beside you" />
              <p className="mt-6 max-w-[52ch] text-[16px] leading-relaxed text-[var(--lux-muted-light)]">
                Fabrics carefully selected from faraway lands: nets, laces, organzas, velvets and embroidered pieces, matched to the occasion and to
                you.
              </p>
            </div>
            <div className="lux-frame relative aspect-[3/2] overflow-hidden rounded-[4px] shadow-[0_30px_70px_-35px_rgba(29,21,18,0.55)]">
              <Image src="/studio/needleye-studio.webp" alt="The fabric library at the Needle Eye studio" fill sizes="(min-width: 1024px) 620px, 100vw" className="object-cover" />
            </div>
          </div>
          <ul className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FABRICS.map((f) => (
              <li key={f.name} className="border-t border-[rgba(122,92,40,0.28)] pt-5">
                <h3 className="font-serif text-[19px] font-semibold text-[var(--lux-ink)]">{f.name}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--lux-muted-light)]">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- The bridal design process ---------------- */}
      <section id="process" className="relative scroll-mt-4 overflow-hidden bg-[var(--lux-noir)] text-[var(--lux-ivory)]">
        <div aria-hidden className="lux-glow absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-10 lg:py-28">
          <SectionTitle eyebrow="How we work" title="The bridal design process" dark />
          <ol className="mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-7">
            {PROCESS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="lux-gold-text font-serif text-[44px] leading-none font-semibold" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="lux-hairline mt-4 w-full opacity-60" aria-hidden />
                <h3 className="mt-4 text-[15px] font-semibold tracking-wide text-white">{s.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--lux-muted-dark)]">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14">
            <a href="#enquiry" className="lux-btn-gold">
              Begin with a consultation
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- Testimonials ---------------- */}
      <section aria-labelledby="words-title" className="mx-auto max-w-7xl px-5 py-20 sm:px-10 lg:py-28">
        <SectionTitle id="words-title" eyebrow="Inspiring generations" title="In our clients' words" />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-[6px] bg-white/60 p-8 shadow-[0_24px_60px_-40px_rgba(29,21,18,0.45)] ring-1 ring-[rgba(122,92,40,0.15)]">
              <span aria-hidden className="lux-gold-text font-serif text-[64px] leading-[0.6]">
                &ldquo;
              </span>
              <blockquote className="mt-4 flex-1 font-serif text-[18px] leading-relaxed text-[var(--lux-ink)] italic">{t.quote}</blockquote>
              <figcaption className="lux-eyebrow mt-6 text-[var(--lux-gold-deep)]">{t.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------------- Visit ---------------- */}
      <section id="visit" className="relative scroll-mt-4 overflow-hidden bg-[var(--lux-noir)] text-[var(--lux-ivory)]">
        <div aria-hidden className="lux-glow absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:py-28">
          <div>
            <SectionTitle eyebrow="Visit the studio" title="Come and see the fabrics in person" dark />
            <address className="mt-8 text-[16px] leading-[1.8] text-[var(--lux-muted-dark)] not-italic">
              {CONTACT.addressLines.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </address>
            <ul className="mt-8 space-y-3 text-[15px]">
              <li>
                <a href={CONTACT.phoneHref} className="inline-flex items-center gap-3 text-white transition-colors hover:text-[var(--lux-gold-light)]">
                  <PhoneGlyph /> {CONTACT.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-3 text-white transition-colors hover:text-[var(--lux-gold-light)]">
                  <MailGlyph /> {CONTACT.email}
                </a>
              </li>
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={CONTACT.mapsUrl} target="_blank" rel="noopener noreferrer" className="lux-btn-ghost">
                <PinGlyph /> Get directions
              </a>
              <a href="#enquiry" className="lux-btn-gold">
                Book a consultation
              </a>
            </div>
          </div>
          {visitPhoto && (
            <div className="lux-frame relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[4px] ring-1 ring-[rgba(232,213,166,0.2)]">
              <Image src={visitPhoto.src} alt={visitPhoto.alt} fill sizes="(min-width: 1024px) 448px, 100vw" className="object-cover object-top" />
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-[rgba(232,213,166,0.15)] bg-[var(--lux-noir)] text-[var(--lux-ivory)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span aria-hidden className="lux-monogram block h-10 w-16" />
            <div>
              <p className="font-serif text-[20px] tracking-[0.2em] uppercase">{BRAND.name}</p>
              <p className="mt-1 font-serif text-[13px] text-[var(--lux-gold-light)] italic">
                {BRAND.byline} · {BRAND.city}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13.5px] text-white/70">
            <a href={SOCIAL.instagram.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[var(--lux-gold-light)]">
              <InstagramGlyph /> Instagram
            </a>
            <a href={SOCIAL.facebook.href} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--lux-gold-light)]">
              Facebook
            </a>
            <a href={SOCIAL.youtube.href} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--lux-gold-light)]">
              YouTube
            </a>
            <span className="text-white/40">© {new Date().getFullYear()} {BRAND.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title, dark = false, id }: { eyebrow: string; title: string; dark?: boolean; id?: string }) {
  return (
    <div>
      <p className={`lux-eyebrow ${dark ? "text-[var(--lux-gold)]" : "text-[var(--lux-gold-deep)]"}`}>{eyebrow}</p>
      <h2 id={id} className="mt-4 max-w-[22ch] font-serif text-[34px] leading-[1.12] font-semibold sm:text-[44px]">
        {title}
      </h2>
      <div className="lux-hairline mt-6 w-32" aria-hidden />
    </div>
  );
}

/** Outline glyphs (decorative; the link text carries the meaning). */
function InstagramGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function PhoneGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function PinGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
