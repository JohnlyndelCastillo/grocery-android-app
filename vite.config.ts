import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
