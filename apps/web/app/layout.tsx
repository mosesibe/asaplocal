import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { auth } from "@asaplocal/auth";
import { ThemeScript, RegisterServiceWorker } from "@asaplocal/ui";
import { SiteHeader } from "@/components/site-header";
import { WebBottomNav } from "@/components/web-bottom-nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL ?? "https://asaplocal.pro"),
  title: { default: "AsapLocal — Find trusted local service providers", template: "%s | AsapLocal" },
  description:
    "Compare, message and book vetted local cleaners, plumbers, electricians, gardeners, handymen, movers, tutors and pet sitters near you.",
  openGraph: {
    type: "website",
    siteName: "AsapLocal",
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#c15f2a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          <RegisterServiceWorker />
          <SiteHeader session={session} />
          <main className="min-h-[70vh] pb-28 md:pb-0">{children}</main>
          <WebBottomNav session={session} />
        </Providers>
      </body>
    </html>
  );
}
