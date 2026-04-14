import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

const rawPort = process.env.PORT || "3000";
const port = Number(rawPort) || 3000;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: {
        name: "SignalMaster Pro v7 Ultimate",
        short_name: "SMP v7",
        description: "Plataforma premium de sinais para opções binárias",
        theme_color: "#00ff88",
        background_color: "#07070d",
        display: "standalone",
        orientation: "portrait",
        start_url: basePath,
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
        categories: ["finance", "productivity"],
        screenshots: [],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Exclude html — let navigateFallback handle SPA routes explicitly
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        // SPA fallback only for SignalMaster Pro's own routes
        navigateFallback: "/index.html",
        // Do NOT intercept other apps' paths
        navigateFallbackDenylist: [/^\/ai-nexus-studio/, /^\/ai-chat/, /^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.binance\.com\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "binance-api", expiration: { maxEntries: 50, maxAgeSeconds: 60 } },
          },
        ],
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { strict: true, deny: ["**/.*"] },
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: true },
      "/socket.io": { target: "http://localhost:8080", changeOrigin: true, ws: true },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
