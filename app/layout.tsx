// The whole app relies on runtime env (Supabase). Never SSG — always render on demand.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import { config as faConfig } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { getAppOrigin } from "@/lib/app-origin";

// Prevent FA from auto-adding its CSS a second time (we import it in globals)
faConfig.autoAddCss = false;

const inter = Inter({
  subsets: ["latin", "greek"],
  variable: "--font-inter",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppOrigin()),
  title: {
    default: "AGROTIK · Η αγορά της γης",
    template: "%s · AGROTIK",
  },
  description:
    "Δωρεάν απευθείας σύνδεση αγροτών και αλιέων με εμπόρους και εργοστάσια. Πραγματικές τιμές, χωρίς μεσάζοντες.",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    locale: "el_GR",
    siteName: "AGROTIK",
    title: "AGROTIK · Η αγορά της γης",
    description: "Δωρεάν απευθείας σύνδεση αγροτών και αλιέων με εμπόρους και εργοστάσια.",
    images: [{ url: "/hero.jpg", width: 1200, height: 800, alt: "AGROTIK" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AGROTIK · Η αγορά της γης",
    description: "Δωρεάν απευθείας σύνδεση παραγωγών με εμπόρους και εργοστάσια.",
    images: ["/hero.jpg"],
  },
};

export const viewport = {
  themeColor: "#1B4D2E",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="el"
      className={`${inter.variable} ${fraunces.variable} ${mono.variable}`}
    >
      <body className="bg-brand-bg text-brand-ink">
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[200] -translate-y-24 rounded-md bg-brand-dark px-4 py-3 font-semibold text-white shadow-elev transition-transform focus:translate-y-0"
        >
          Μετάβαση στο κύριο περιεχόμενο
        </a>
        <div id="main-content" tabIndex={-1}>{children}</div>
      </body>
    </html>
  );
}
