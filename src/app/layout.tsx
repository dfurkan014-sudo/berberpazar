// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

export const metadata: Metadata = {
  // OG/Twitter mutlak URL üretimi için
  metadataBase: new URL(BASE_URL),

  title: {
    default: "BerberPazar – İkinci El ve Sıfır Berber & Kuaför Ekipmanları",
    template: "%s · BerberPazar",
  },
  description:
    "BerberPazar, berber ve kuaför ekipmanlarının alınıp satıldığı online pazar yeri. İkinci el veya sıfır tıraş makineleri, makaslar, jiletler ve daha fazlasını burada bulabilirsiniz.",

  // Google pek kullanmasa da kalabilir
  keywords: [
    "berber",
    "kuaför",
    "berber ekipmanları",
    "kuaför ekipmanları",
    "tıraş makinesi",
    "sakal düzeltici",
    "fön makinesi",
    "makas",
    "jilet",
    "ikinci el",
    "2.el",
    "sıfır",
  ],

  // Kanonik (sayfa bazında generateMetadata ile override edilebilir)
  alternates: {
    canonical: "/",
  },

  // Arama motoru direktifleri
  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    type: "website",
    siteName: "BerberPazar",
    title: "BerberPazar – İkinci El ve Sıfır Berber & Kuaför Ekipmanları",
    description:
      "Berber ve kuaför ekipmanlarını al & sat: ikinci el/sıfır tıraş makineleri, makaslar, jiletler, fön makineleri ve daha fazlası.",
    url: BASE_URL,
    images: [
      {
        url: "/og-default.jpg", // dosyan yoksa kaldırabilirsin
        width: 1200,
        height: 630,
        alt: "BerberPazar",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "BerberPazar",
    description:
      "Berber ve kuaför ekipmanlarını al & sat: ikinci el ve sıfır ürünler.",
    images: ["/og-default.jpg"],
  },

  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/Berberamb.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
