import type { Metadata } from "next";
import { Geist, Geist_Mono, Russo_One } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Navbar } from "@/components/navbar";
import { UserSync } from "@/components/user-sync";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const russoOne = Russo_One({
  weight: "400",
  variable: "--font-russo",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Handball Stats - ASC Rennais",
  description: "Application de statistiques de handball pour l'ASC Rennais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="fr" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${russoOne.variable} antialiased min-h-screen bg-slate-50 overflow-x-hidden`}
        >
          <Toaster />
          <UserSync />
          <Navbar />
          <main className="pb-20">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
