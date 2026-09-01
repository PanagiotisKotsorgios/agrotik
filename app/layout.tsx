// The whole app relies on runtime env (Supabase). Never SSG — always render on demand.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import { config as faConfig } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";

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
  title: {
    default: "AGROTIK · Η αγορά της γης",
    template: "%s · AGROTIK",
  },
  description:
    "Δωρεάν απευθείας σύνδεση αγροτών και αλιέων με εμπόρους και εργοστάσια. Πραγματικές τιμές, χωρίς μεσάζοντες.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="el"
      className={`${inter.variable} ${fraunces.variable} ${mono.variable}`}
    >
      <body className="bg-brand-bg text-brand-ink">{children}</body>
    </html>
  );
}
