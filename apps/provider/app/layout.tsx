import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { canHaveStaff } from "@asaplocal/core";
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

  let account = null;
  if (session?.user) {
    const [profile, business] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: session.user.id }, select: { firstName: true, lastName: true, avatarUrl: true, city: true } }),
      prisma.business.findUnique({ where: { ownerId: session.user.id }, select: { name: true, city: true, verificationStatus: true, trustTier: true, businessType: true } }),
    ]);
    account = {
      name: profile ? `${profile.firstName} ${profile.lastName}` : (business?.name ?? session.user.email ?? ""),
      email: session.user.email ?? "",
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      avatarUrl: profile?.avatarUrl ?? session.user.image,
      city: business?.city ?? profile?.city ?? "",
      verificationStatus: business?.verificationStatus ?? "UNVERIFIED",
      trustTier: business?.trustTier ?? "BRONZE",
      canHaveStaff: canHaveStaff(business?.businessType),
    };
  }

  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {account ? <ProviderShell account={account}>{children}</ProviderShell> : children}
        </Providers>
      </body>
    </html>
  );
}
