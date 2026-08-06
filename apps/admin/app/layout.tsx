import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { ThemeScript } from "@asaplocal/ui";
import { AdminShell } from "@/components/admin-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "AsapLocal Admin", template: "%s | AsapLocal Admin" },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const pendingApprovals =
    session?.user?.role === "ADMIN" ? await prisma.approvalRequest.count({ where: { status: "PENDING" } }) : 0;

  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {session?.user ? (
            <AdminShell role={session.user.role} name={session.user.name} email={session.user.email} pendingApprovals={pendingApprovals}>
              {children}
            </AdminShell>
          ) : (
            children
          )}
        </Providers>
      </body>
    </html>
  );
}
