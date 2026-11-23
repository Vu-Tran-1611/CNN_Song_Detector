import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Song Detector",
    short_name: "Song Detector",
    description: "Tap listen and a CNN identifies which of 10 songs is playing.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ebebeb",
    theme_color: "#ebebeb",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
