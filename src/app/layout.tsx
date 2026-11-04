import type { Metadata, Viewport } from "next";
import { Bangers, Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-body" });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-display" });
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
  themeColor: "#07080c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable} ${bangers.variable}`}>
      <body>{children}</body>
    </html>
  );
}
