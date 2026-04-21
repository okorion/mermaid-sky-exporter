import type { MetadataRoute } from "next";
import {
  SITE_BACKGROUND_COLOR,
  SITE_DESCRIPTION,
  SITE_LANG,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_THEME_COLOR,
} from "@/libs/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: SITE_BACKGROUND_COLOR,
    theme_color: SITE_THEME_COLOR,
    lang: SITE_LANG,
    categories: ["developer", "productivity", "utilities"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/homepage.png",
        sizes: "1440x900",
        type: "image/png",
        form_factor: "wide",
        label: `${SITE_NAME} homepage`,
      },
    ],
  };
}
