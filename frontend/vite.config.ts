import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:8088", changeOrigin: true },
      "/login": { target: "http://127.0.0.1:8088", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:8088", changeOrigin: true },
    },
  },
});


