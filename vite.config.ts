import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Разрешить доступ извне, включая встроенные браузеры
    port: 8080,
    strictPort: true,
    cors: true,
    // Разрешённые хосты для dev-сервера (чтобы Vite не блокировал запросы)
    allowedHosts: ["localhost", "127.0.0.1", "frontend", "frontend:8080", "frontend:8081", "cifra.pastbin.pro"],
    hmr: {
      host: "localhost",
    },
    // Проксирование API: браузер ходит на /api своего origin,
    // а vite-сервер перенаправляет запрос на backend (внутри docker-сети).
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://backend:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
