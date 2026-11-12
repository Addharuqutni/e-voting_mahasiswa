/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/** @type {import('next').NextConfig} */
export default {
  // VPS kecil: standalone output (bundle minimal, tanpa node_modules penuh).
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  // tidak memakai next/image (semua <img> biasa) -> optimizer & sharp tidak perlu
  images: { unoptimized: true },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // aset statis: cache 7 hari (nama file tidak ber-hash, jadi bukan immutable)
      { source: "/assets/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/template/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
  experimental: {
    serverActions: {
      // foto/CV lewat /api/upload (maks 5MB); action body tetap kecil.
      bodySizeLimit: "1mb",
    },
  },
};
