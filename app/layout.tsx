import type { Metadata, Viewport } from "next";
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
    // without this, some previews infer a "site name" from the domain
    // itself — a .github.io URL reads as "GitHub" instead of the actual name
    siteName: "Andrew Rusli",
  },
  twitter: {
    title: "Andrew Rusli",
  },
  robots: {
    index: true,
    follow: true,
    // noimageindex keeps the sketches out of Google Images; max-image-preview
    // "none" is the separate directive that stops Google from pulling one of
    // them in as a search-result or Discover thumbnail
    noimageindex: true,
    "max-image-preview": "none",
  },
};

// matches --color-paper — mobile browser chrome (address bar, etc.) tints to
// the site's own black instead of defaulting to white
export const viewport: Viewport = {
  themeColor: "#000000",
};

// a real signal for search engines' entity/name detection — Google's own
// title in results is its own algorithmic choice, not directly settable,
// but structured data like this is the standard way to nudge it toward the
// actual name instead of the raw domain
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Andrew Rusli",
  url: "https://arusli1.github.io",
  sameAs: [
    "https://www.linkedin.com/in/andrew-rusli",
    "https://github.com/arusli1",
    "https://instagram.com/and.rawr",
    "https://scholar.google.com/citations?user=VJGcga0AAAAJ",
    "https://twitter.com/and_rawr",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistMono.variable} ${rockSalt.variable}`}>
      <body className="min-h-screen bg-paper text-ink font-body antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <SocialBar />
        {children}
      </body>
    </html>
  );
}
