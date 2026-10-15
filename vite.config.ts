import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Grocery List",
        short_name: "Grocery",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2e7d32",
        icons: [
          { src: "grocery-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "grocery-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      }
    })
  ],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"]
  }
});