import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { PlayerDock } from "@/components/player/PlayerDock";
import { SiteHeader } from "@/components/SiteHeader";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CastAWAI Music — Music. Technology. Culture.",
    template: "%s · CastAWAI Music",
  },
  description:
    "CastAWAI Music by CastAWAI Media Group: a premium streaming home for human-created, AI-assisted and AI-generated music.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="pb-28" suppressHydrationWarning>
        <SessionProvider>
          <PlayerProvider>
            <SiteHeader />
            <main>{children}</main>
            <footer className="mt-16 border-t border-[var(--color-border)]">
              <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                <p className="font-display text-lg font-bold">
                  <span className="chrome-text">CASTAWAI</span> <span className="text-[var(--color-accent)]">MUSIC</span>
                </p>
                <p className="eyebrow mt-1">CastAWAI Media Group · Music. Technology. Culture.</p>
                <p className="mt-4 max-w-2xl text-xs leading-relaxed text-[var(--color-muted)]">
                  Currently operating with clearly labeled demo content while rights, licensing, payment
                  (Stripe), object storage and CDN integrations are being connected. Premium is $9.99/month
                  (proposed) with an ad-supported free tier. The CastAWAI Music Awards are never purchasable;
                  chart positions cannot be bought.
                </p>
                <p className="mt-4 text-xs text-[var(--color-muted)]">
                  © {new Date().getFullYear()} CastAWAI Media Group. All rights reserved.
                </p>
              </div>
            </footer>
            <PlayerDock />
          </PlayerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
