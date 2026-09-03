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
  // to scraping a random sketch off the page, not a small favicon. A small
  // square image + twitter:card "summary" is the one that actually avoids
  // that while staying compact (some over-eager clients still render it
  // larger than a true favicon, but it's not a full sketch-scraping banner)
  openGraph: {
    // just the name, not the "| Efficient ML" tab-title suffix — matches a
    // plain name + domain + small logo link-preview card
    title: "Andrew Rusli",
    images: ["/social-icon.png"],
  },
  twitter: {
    card: "summary",
    title: "Andrew Rusli",
    images: ["/social-icon.png"],
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
