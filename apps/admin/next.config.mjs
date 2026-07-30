/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*"],
  },
  transpilePackages: ["@asaplocal/ui", "@asaplocal/auth", "@asaplocal/db", "@asaplocal/core"],
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }];
  },
};
export default nextConfig;
