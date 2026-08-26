import type { MetadataRoute } from "next";

/**
 * Without this the provider app is not installable at all: Chrome only fires
 * `beforeinstallprompt` for an origin that serves a manifest with 192px and
 * 512px icons, so the install banner could never have appeared here.
 *
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Both spell it out. short_name is what labels the home-screen icon, and
    // "AsapLocal" alone was indistinguishable from the customer app for anyone
    // who has both installed.
    name: "AsapLocal Business",
    short_name: "AsapLocal Business",
    description: "Manage leads, bookings, and your business profile on AsapLocal.",
    start_url: "/",
    display: "standalone",
    // Matches the launch splash's ground (Navy Dark), so the system splash
    // Android draws before the page loads reads as the same screen rather
    // than a white one in front of it.
    background_color: "#00143D",
    theme_color: "#002059",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
