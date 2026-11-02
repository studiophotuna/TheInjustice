import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Injustice",
    short_name: "Injustice",
    description: "From the Gutter to power in Grayhaven.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4e9d0",
    theme_color: "#ffd23f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
