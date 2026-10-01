import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@assets": path.resolve(root, "../assets"),
    },
  },
  server: {
    port: 5173,
    fs: { allow: [path.resolve(root, "../../..")] },
    proxy: {
      "/styles": "http://127.0.0.1:8787",
      "/governorates": "http://127.0.0.1:8787",
      "/promos": "http://127.0.0.1:8787",
      "/checkout": "http://127.0.0.1:8787",
      "/thank-you": "http://127.0.0.1:8787",
      "/catalog": "http://127.0.0.1:8787",
      "/health": "http://127.0.0.1:8787",
    },
  },
});
