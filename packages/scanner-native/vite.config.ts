import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Plain CSS only. An inline config stops Vite from picking up the parent
  // Next.js app's postcss.config.mjs and running Tailwind on this package.
  css: {
    postcss: { plugins: [] },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
