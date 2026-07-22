import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { auth } from "@asaplocal/auth";
import { AdminShell } from "@/components/admin-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "AsapLocal Admin", template: "%s | AsapLocal Admin" },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{session?.user ? <AdminShell role={session.user.role}>{children}</AdminShell> : children}</Providers>
      </body>
    </html>
  );
}
