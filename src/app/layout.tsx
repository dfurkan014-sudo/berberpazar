import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "berberpazar",
    template: "%s · berberpazar",
  },
  description: "Next.js + Prisma küçük ilan uygulaması",
  icons: {
    // Next.js /app/icon.png varsa otomatik kullanılır.
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/Berberamb.png", sizes: "32x32", type: "image/png" },
      { url: "/Berberamb.png", sizes: "192x192", type: "image/png" },
      { url: "/Berberamb.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  // manifest eklemek istersen public/altına koyup aşağıyı açabilirsin:
  // manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
