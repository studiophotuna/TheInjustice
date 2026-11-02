import type { Metadata, Viewport } from "next";
import { Bangers, Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-body" });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-display" });
const bangers = Bangers({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-sfx" });

export const metadata: Metadata = {
  title: "Injustice",
  description: "Framed, jailed and released with nothing. Climb from the Gutter to power in Grayhaven.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Injustice", statusBarStyle: "black-translucent" },
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
