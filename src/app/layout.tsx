import type { Metadata, Viewport } from "next";
import { Bangers, IBM_Plex_Mono, IBM_Plex_Sans, Special_Elite } from "next/font/google";
import "./globals.css";
import "./casefile.css";

// Case-file type: a typewriter for headings and stamps, IBM Plex for reading and for figures.
const body = IBM_Plex_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], display: "swap", variable: "--font-body" });
const mono = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], display: "swap", variable: "--font-mono" });
const typewriter = Special_Elite({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-display" });
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
  themeColor: "#120f0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${mono.variable} ${typewriter.variable} ${bangers.variable}`}>
      <body>{children}</body>
    </html>
  );
}
