import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { validateConfig } from "./scripts/config.js";
export default defineConfig(({ mode }) => {
  validateConfig({ ...loadEnv(mode, process.cwd(), ""), ...process.env });
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
        manifest: {
          name: "Syncora",
          short_name: "Syncora",
          description: "A private listening room for up to six people",
          theme_color: "#10141f",
          background_color: "#10141f",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "/icon-192.png?v=2",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icon-512.png?v=2",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,gif}"],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],
  };
});
