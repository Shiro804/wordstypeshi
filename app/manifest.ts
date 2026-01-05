import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BatasWordle",
    short_name: "BatasWordle",
    description: "Clean, ad-free word puzzle.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [{ src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" }],
  };
}
