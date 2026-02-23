import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true, // allow any host (ngrok, localtunnel, etc.)
    proxy: {
      // ── Express API (port 5000) ──────────────────────────────────────────
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      // ── Socket.io (port 5000) ────────────────────────────────────────────
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        ws: true, // proxy WebSocket upgrades
      },
      // ── FastAPI Agent – chat endpoint (port 8000) ────────────────────────
      "/chat": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      // ── FastAPI Agent – planner endpoint (port 8000) ─────────────────────
      "/planner": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
