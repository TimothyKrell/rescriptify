import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    watch: {
      ignored: ["**/data/**", "**/dist/**"],
    },
    proxy: { "/api": "http://localhost:8787", "/media": "http://localhost:8787" },
  },
});
