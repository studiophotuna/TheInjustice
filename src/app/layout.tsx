import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./tokens.css";
import "./globals.css";
import "./game.css";
import "./kit.css";
import "./syndicate.css";
import { CrashReporter } from "@/components/crashes";
import pkg from "../../package.json";

// Game type (the syndicate kit): Outfit for headlines, names and numbers; Plus Jakarta Sans for
// reading text. Outfit also stands in for the old comic and mono faces (fight words, timers).
const body = Plus_Jakarta_Sans({ weight: ["400", "500", "600", "700", "800"], subsets: ["latin"], display: "swap", variable: "--font-body" });
const display = Outfit({ weight: ["500", "600", "700", "800", "900"], subsets: ["latin"], display: "swap", variable: "--font-display" });

export const metadata: Metadata = {
  title: "Conspira · Every move has an agenda",
  description: "Every move has an agenda. Framed, jailed and released with nothing: climb from the Gutter to power, and decide whose side you're on.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Conspira", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10141a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <CrashReporter version={pkg.version} />
        {children}
      </body>
    </html>
  );
}
