import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  /**
   * VOICEGRAM static files under /vibe-tools/ — avoid long-lived CDN/browser cache
   * so https://…vercel.app/vibe-tools/index.html picks up new JS after each deploy.
   */
  async headers() {
    return [
      {
        source: "/vibe-tools/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/vibe-tools/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
