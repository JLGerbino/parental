import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/app-gastos/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "Vamo&Vamo",
        short_name: "Vamo&Vamo",
        description: "La manera más fácil de compartir gastos",
        theme_color: "#ADC1c0",
        background_color: "#ADC1c0",
        display: "standalone",
        start_url: "/app-gastos/",
        icons: [
          {            
            src: "/app-gastos/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {            
            src: "/app-gastos/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ],
      },
    }),
  ],
});





