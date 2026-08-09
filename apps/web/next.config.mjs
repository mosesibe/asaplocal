const isDev = process.env.NODE_ENV !== "production";

// Direct-to-S3 uploads are a browser fetch() to the bucket host, so it has to
// be allowed in connect-src or the PUT is blocked before it leaves the page
// (surfacing only as "Failed to fetch"). Note CSP host grammar only allows a
// wildcard as the leftmost label — `*.s3.*.amazonaws.com` is valid for Next's
// image remotePatterns but NOT here — so pin the exact host when the bucket
// env is present at build time and fall back to a legal wildcard otherwise.
const S3_ORIGIN =
  process.env.AWS_S3_BUCKET && process.env.AWS_REGION
    ? `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`
    : "https://*.amazonaws.com";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*"],
  },
  transpilePackages: ["@asaplocal/ui", "@asaplocal/auth", "@asaplocal/db"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://js.stripe.com; connect-src 'self' https://api.stripe.com https://*.pusher.com wss://*.pusher.com ${S3_ORIGIN};`,
          },
        ],
      },
    ];
  },
};
export default nextConfig;
