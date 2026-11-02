import type { Metadata, Viewport } from "next";
import { Bangers } from "next/font/google";
import "./globals.css";

const bangers = Bangers({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-comic" });

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
  themeColor: "#ffd23f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bangers.variable}>
      <body>{children}</body>
    </html>
  );
}
