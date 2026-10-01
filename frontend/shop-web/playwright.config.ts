import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const here = fileURLToPath(new URL(".", import.meta.url));
const repo = path.resolve(here, "../..");
const viteNode = path.join(repo, "node_modules/vite-node/vite-node.mjs");
const vite = path.join(repo, "node_modules/vite/bin/vite.js");

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: [
    { command: `node ${viteNode} e2e/server.ts`, port: 8799, reuseExistingServer: false, cwd: here },
    { command: `VITE_API_ORIGIN=http://127.0.0.1:8799 node ${vite} --port 4173 --strictPort`, port: 4173, reuseExistingServer: false, cwd: here },
  ],
});
