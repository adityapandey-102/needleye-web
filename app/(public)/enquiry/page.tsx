import type { Metadata } from "next";
import { loadBrandPhotos } from "../../../lib/brand/gallery";
import { EnquiryLanding } from "../../../modules/leads/components/EnquiryLanding";

export const metadata: Metadata = {
  title: "Needleye by Sakina Ahmed · Couture in Bangalore",
  description: "Bridal, festive and occasion wear made to your measure. Tell us what you'd like and our team will call you back.",
  openGraph: {
    title: "Needleye by Sakina Ahmed",
    description: "Couture made to your measure in Bangalore. Send an enquiry and our team will call you back.",
    images: ["/Needleye-logo.png"],
  },
};

/** The public enquiry page: anyone can send one; it arrives as a New lead for the owner. */
export default function EnquiryPage() {
  return <EnquiryLanding photos={loadBrandPhotos()} />;
}
