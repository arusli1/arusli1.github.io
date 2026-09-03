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
  // shreyanpaliwal.com's real (JS-rendered) homepage has no og:image at all
  // either, just icon.png + apple-touch-icon (both PNG) — the first attempt
  // at this, before app/apple-icon.png existed, fell back to scraping a
  // sketch off the page instead. Retrying now that a real PNG
  // apple-touch-icon exists, matching their actual setup.
  openGraph: {
    // just the name, not the "| Efficient ML" tab-title suffix — matches a
    // plain name + domain + small logo link-preview card
    title: "Andrew Rusli",
  },
  twitter: {
    card: "summary",
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
