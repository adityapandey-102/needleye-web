import type { Metadata } from "next";
import { loadBrandPhotos } from "../../../lib/brand/gallery";
import { EnquiryLanding } from "../../../modules/leads/components/EnquiryLanding";
import { BRAND, CONTACT, SOCIAL } from "../../../modules/leads/content/needleEye";

export const metadata: Metadata = {
  title: `${BRAND.name} ${BRAND.byline} · Bridal couture in Bengaluru`,
  description:
    "Bridal sarees, blouses and lehengas, made to measure and embroidered by hand at our studio near Commercial Street, Bengaluru. Send an enquiry and our team will call you back.",
  openGraph: {
    title: `${BRAND.name} ${BRAND.byline}`,
    description: "Bridal couture made to your measure in Bengaluru. Send an enquiry and our team will call you back.",
    images: ["/Needleye-logo.png"],
  },
};

/** The shop as a local business, for search engines -- the same facts the page shows. */
const BUSINESS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  name: `${BRAND.name} ${BRAND.byline}`,
  image: "/Needleye-logo.png",
  telephone: "+91-9731960904",
  email: CONTACT.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: CONTACT.street,
    addressLocality: CONTACT.locality,
    addressRegion: CONTACT.region,
    postalCode: CONTACT.postalCode,
    addressCountry: "IN",
  },
  sameAs: [SOCIAL.instagram.href, SOCIAL.facebook.href, SOCIAL.youtube.href],
};

/** The public enquiry page: anyone can send one; it arrives as a New lead for the owner. */
export default function EnquiryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static facts from our own constants; "<" is escaped so the JSON can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BUSINESS_JSON_LD).replace(/</g, "\\u003c") }}
      />
      <EnquiryLanding photos={loadBrandPhotos()} />
    </>
  );
}
