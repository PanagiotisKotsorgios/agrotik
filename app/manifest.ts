import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AGROTIK · Η αγορά της γης",
    short_name: "AGROTIK",
    description: "Απευθείας σύνδεση παραγωγών, εμπόρων και εργοστασίων.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F5EE",
    theme_color: "#1B4D2E",
    lang: "el",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
