import type { MetadataRoute } from "next";

/**
 * Without this the provider app is not installable at all: Chrome only fires
 * `beforeinstallprompt` for an origin that serves a manifest with 192px and
 * 512px icons, so the install banner could never have appeared here.
 *
 * short_name is deliberately distinct from the customer app's — someone may
 * have both installed, and two "AsapLocal" icons would be indistinguishable.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AsapLocal for Business",
    short_name: "AsapLocal Biz",
    description: "Manage leads, bookings, and your business profile on AsapLocal.",
    start_url: "/",
    display: "standalone",
    // Matches the light default the app now boots into.
    background_color: "#ffffff",
    theme_color: "#c15f2a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
