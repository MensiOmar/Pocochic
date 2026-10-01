import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { "@brand": path.resolve(root, "../../../brand") } },
  server: {
    port: 5174,
    fs: { allow: [path.resolve(root, "../../..")] },
    proxy: {
      "/session": "http://127.0.0.1:8788",
      "/orders": "http://127.0.0.1:8788",
      "/health": "http://127.0.0.1:8788",
    },
  },
});
