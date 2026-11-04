import type { Metadata, Viewport } from "next";
import { Bangers, Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./game.css";

// Game type: Barlow for reading, Barlow Condensed for the HUD and headings, a mono for timers.
const body = Barlow({ weight: ["400", "500", "600", "700"], subsets: ["latin"], display: "swap", variable: "--font-body" });
const display = Barlow_Condensed({ weight: ["500", "600", "700", "800"], subsets: ["latin"], display: "swap", variable: "--font-display" });
const mono = JetBrains_Mono({ weight: ["500", "700"], subsets: ["latin"], display: "swap", variable: "--font-mono" });
const bangers = Bangers({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-sfx" });

export const metadata: Metadata = {
  title: "Conspira · Every move has an agenda",
  description: "Every move has an agenda. Framed, jailed and released with nothing: climb from the Gutter to power, and decide whose side you're on.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Conspira", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0c11",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${mono.variable} ${bangers.variable}`}>
      <body>{children}</body>
    </html>
  );
}
