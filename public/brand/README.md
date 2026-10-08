# Enquiry page photos

Every JPG / PNG / WebP / AVIF image in this folder appears on the public
enquiry page (`/enquiry`), in file-name order: in the moving "garment rail" at
the top and in the "Our brides" gallery. Some sections prefer a particular
photo by file name (see `modules/leads/content/needleEye.ts`, `COLLECTIONS`);
if that file is gone, they use another photo from this folder instead.

- Name files to set the order and the description, e.g.
  `01-red-bridal-lehenga.webp`, `02-ivory-anarkali.webp`
  (the alt text becomes "Red bridal lehenga by Needle Eye").
- Portrait photos work best (3:4). About 1400 px tall is plenty; keep each
  under ~250 KB (WebP). The site serves resized copies.
- Keep a photographer's credit if the photo carries one -- crop away only app
  overlays such as Instagram's carousel dots.
- Commit and redeploy the web app to publish new photos.

The current photos are Needle Eye's own brides, from the shop's Instagram
(October 2026). Use only photos of Needle Eye's own work -- never stock photos
or models from photo libraries.
