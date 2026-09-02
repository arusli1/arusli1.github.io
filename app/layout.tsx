import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocialBar } from "@/components/SocialBar";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Website",
  description: "Design-heavy scaffold.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geistMono.variable}>
      <body className="min-h-screen bg-paper text-ink font-body antialiased">
        <SocialBar />
        {children}
      </body>
    </html>
  );
}
