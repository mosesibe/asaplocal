import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { auth } from "@asaplocal/auth";
import { ThemeScript } from "@asaplocal/ui";
import { ProviderShell } from "@/components/provider-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "AsapLocal for Business", template: "%s | AsapLocal Business" },
  description: "Manage leads, bookings, and your business profile on AsapLocal.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {session?.user ? <ProviderShell>{children}</ProviderShell> : children}
        </Providers>
      </body>
    </html>
  );
}
