import type { Metadata } from "next";
import { Geist_Mono, Rock_Salt } from "next/font/google";
import "./globals.css";
import { SocialBar } from "@/components/SocialBar";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rockSalt = Rock_Salt({
  variable: "--font-rock-salt",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://arusli1.github.io"),
  title: "Andrew Rusli | Efficient ML",
  // no og:image at all was tried and confirmed broken — iMessage falls back
  // to scraping a random sketch off the page instead of showing nothing.
  // A real designed banner (app/opengraph-image.png, Next's file convention
  // — picked up automatically, no images[] needed here) is the actual fix:
  // it's real gallery content either way, so show our own crop of it
  // instead of leaving it to a scraper's guess.
  openGraph: {
    // just the name, not the "| Efficient ML" tab-title suffix
    title: "Andrew Rusli",
  },
  twitter: {
    title: "Andrew Rusli",
  },
  robots: {
    index: true,
    follow: true,
    noimageindex: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistMono.variable} ${rockSalt.variable}`}>
      <body className="min-h-screen bg-paper text-ink font-body antialiased">
        <SocialBar />
        {children}
      </body>
    </html>
  );
}
