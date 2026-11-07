import type { Metadata, Viewport } from "next";
import { Anton, Bangers, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import "./game.css";
import "./kit.css";
import { CrashReporter } from "@/components/crashes";
import pkg from "../../package.json";

// Game type: Manrope for the interface, Anton (condensed) for headlines and names only, a mono for timers.
const body = Manrope({ weight: ["400", "500", "600", "700", "800"], subsets: ["latin"], display: "swap", variable: "--font-body" });
const display = Anton({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-display" });
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
  themeColor: "#0e1015",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${mono.variable} ${bangers.variable}`}>
      <body>
        <CrashReporter version={pkg.version} />
        {children}
      </body>
    </html>
  );
}
