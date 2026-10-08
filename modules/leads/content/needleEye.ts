/**
 * Needle Eye's public facts and words for the enquiry page -- taken from the
 * shop's previous website (needleye.in: Home, About us, Contact, Fabrics and
 * Bridal Collections pages). Edit here, not in the layout. Only real details:
 * nothing on this page should be invented.
 */

export const BRAND = {
  name: "Needle Eye",
  byline: "by Sakina Ahmed",
  tagline: "Beauty finds its form",
  city: "Bengaluru",
} as const;

export const CONTACT = {
  addressLines: ["89/2, Dickenson Road", "Next to Skipper Furnishings, near Commercial Street", "Rukmani Colony, Sivanchetti Gardens", "Bengaluru, Karnataka 560042"],
  street: "89/2, Dickenson Road, next to Skipper Furnishings, near Commercial Street, Rukmani Colony, Sivanchetti Gardens",
  locality: "Bengaluru",
  region: "Karnataka",
  postalCode: "560042",
  phoneDisplay: "+91 97319 60904",
  phoneHref: "tel:+919731960904",
  email: "needleeyeofficial@gmail.com",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("Needle Eye, 89/2 Dickenson Road, near Commercial Street, Sivanchetti Gardens, Bengaluru 560042"),
} as const;

export const SOCIAL = {
  instagram: { href: "https://www.instagram.com/needleeye_bangalore/", label: "@needleeye_bangalore" },
  facebook: { href: "https://www.facebook.com/NeedleEyeBoutique/", label: "NeedleEyeBoutique" },
  youtube: { href: "https://www.youtube.com/channel/UCclkLKLOy2JMOcWgvVZ2D-A", label: "YouTube" },
} as const;

/** About the designer (About us page), lightly shortened. */
export const STORY = {
  heading: "From a garage workshop to brides across the world",
  paragraphs: [
    "Sakina Ahmed began in her garage, alongside a single skilled artisan. Her eye for traditional elegance, her knowledge of fabrics and her devotion to the art of zardozi grew that workshop into Needle Eye.",
    "Today her creations are in the wardrobes of clients in the Middle East, Europe, the United States, South-East Asia and her homeland, India. Each garment is an individual masterpiece, made for one client.",
  ],
  quote:
    "We adhere to a meticulous process I affectionately call channelization, whereby the customer is involved in every step of the enchanting sartorial journey.",
  quoteBy: "Sakina Ahmed",
} as const;

/** What the studio makes (Bridal Collections page). `photo` is a preferred public/brand file. */
export const COLLECTIONS = [
  {
    title: "Bridal sarees",
    body: "Sarees for the wedding day and every ceremony around it, with hand-embroidered blouses.",
    photo: "01-orange-silk-bridal-saree.webp",
  },
  {
    title: "Lehengas",
    body: "Lehengas in net, organza and velvet, with floral, pearl and sequin work.",
    photo: "02-champagne-floral-lehenga.webp",
  },
  {
    title: "Couture blouses",
    body: "Saree and lehenga blouses finished in zardozi, pearls and threadwork.",
    photo: "03-red-bridal-saree-with-hand-embroidered-blouse.webp",
  },
  {
    title: "Gowns and reception looks",
    body: "Gowns and western looks for the reception and the celebrations around it.",
    photo: "08-white-lace-wedding-gown.webp",
  },
] as const;

/** Signature fabrics (Fabrics page), lightly shortened. */
export const FABRICS = [
  { name: "Imported net with hand work", body: "A light, sheer net whose texture plays with light and shadow." },
  { name: "Pearl work on net", body: "Pearl embellishment on a fine net base: luxurious and graceful." },
  { name: "Embroidered heavy lace", body: "The elegance of lace, richly embroidered." },
  { name: "3D appliqué", body: "Raised, three-dimensional detail that sets it apart from flat fabrics." },
  { name: "Imported Brasso velvet", body: "Velvet treated to reveal intricate patterns in its soft pile." },
  { name: "Floral designer embroidery on net", body: "Delicate floral embroidery on a sheer net, light and ethereal." },
  { name: "Dyeable chikankari", body: "Hand-embroidered chikan work, dyed to the colour you want." },
  { name: "Mirror work on georgette and net", body: "Shisha mirrors that catch the light as you move." },
  { name: "Heavy sequin work on power net", body: "Dense sequins on a light, stretchy base, made to sparkle." },
] as const;

/** "Needle Eye bridal design process" (Home page). */
export const PROCESS = [
  { title: "Consultation", body: "Tell us about the occasion, your style, your dates and your budget." },
  { title: "Design concept", body: "We shape the design with you, from your idea or ours." },
  { title: "Fabric selection", body: "Choose your fabrics in our studio, with a designer beside you." },
  { title: "Measurements and fittings", body: "Measured by us, and fitted as the garment takes shape." },
  { title: "Embellishment", body: "Zardozi, pearls, sequins or threadwork, chosen together." },
  { title: "Production", body: "Cut, stitched and embroidered by hand in our atelier." },
  { title: "Final fitting and delivery", body: "A last fitting, and it is ready for your day." },
] as const;

/** Testimonials as published on the previous website (shortened, never reworded). */
export const TESTIMONIALS = [
  {
    quote:
      "Excellent work, mind blowing compliments from my family and friends, the entire wedding trousseau was designed and made to international standard.",
    name: "Naveen Kalyan Santoshi",
  },
  {
    quote: "Fabulous and creative work in each and every aspect without any compromise. My family, relatives and friends have become crazy fans of your design and work.",
    name: "Ramesh Kumar Nagaraj",
  },
  {
    quote: "Awesome designing skills @ Needle Eye. I think it's the finest Boutique in Bangalore. They are excellent for Indian and Western outfits.",
    name: "Agajan Chandrasekaran",
  },
] as const;
