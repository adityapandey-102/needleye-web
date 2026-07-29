import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: allow the dev server's /_next/* resources (incl. the HMR
  // WebSocket) to be requested from this LAN host, so the app can be opened
  // from another device (e.g. a phone) at http://192.168.1.8:3000 without
  // Next 16's cross-origin dev-resource guard blocking HMR. No effect on the
  // production build.
  allowedDevOrigins: ["192.168.1.8"],
};

export default nextConfig;
