/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a fully static site in `out/` via `next build`.
  output: "export",
  // Static export can't use the Next.js Image Optimization server.
  images: { unoptimized: true },
};

export default nextConfig;
