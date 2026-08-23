import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AsapLocal",
    short_name: "AsapLocal",
    description: "Compare, message and book vetted local service providers near you.",
    start_url: "/",
    display: "standalone",
    // The installed app cannot skip the system splash — Android 12+ draws one
    // for every launch, and Chrome generates one for any standalone PWA. It is
    // painted with background_color and the app icon on top, so matching it to
    // the animated splash's ground (hsl(20 35% 7%) = #18100c, see .asl-splash
    // in globals.css) is what stops it reading as a separate white screen in
    // front of the real one.
    background_color: "#18100c",
    theme_color: "#c15f2a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
