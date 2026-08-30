import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#1B4D2E",     // forest
          mid: "#3F8B34",      // muted mid-green
          light: "#7CBB5F",    // sprout
          olive: "#6B7F3F",    // olive-tree tone
          earth: "#A9652E",    // soil accent
          bg: "#F7F5EE",       // warm paper
          surface: "#FFFFFF",
          ink: "#141412",      // near-black w/ warmth
          muted: "#5A5A52",
          border: "#E3DFD1",
          rule: "#D8D2C0",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "eyebrow": ["0.72rem", { letterSpacing: "0.12em", lineHeight: "1.2" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 30, 20, 0.04), 0 1px 1px rgba(20, 30, 20, 0.03)",
        elev: "0 6px 24px rgba(20, 30, 20, 0.08)",
      },
      borderRadius: {
        card: "10px",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        marquee: "marquee 55s linear infinite",
        "fade-in-up": "fade-in-up 700ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
