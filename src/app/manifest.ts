import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rasoi: VCET canteen",
    short_name: "Rasoi",
    description: "Order ahead, split with friends, and collect by token.",
    start_url: "/menu",
    display: "standalone",
    background_color: "#d8eee8",
    theme_color: "#ffc21a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
