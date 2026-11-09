import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const OUT = process.env.PREVIEW_OUT;
const files = readdirSync(OUT).filter((f) => f.endsWith(".html"));

export default defineConfig({
  root: here,
  resolve: {
    alias: [
      { find: /^@\/lib\/market\/actions$/, replacement: here + "shims/actions.ts" },
      { find: /^@\//, replacement: fileURLToPath(new URL("../../src/", import.meta.url)) },
      { find: /^next\/link$/, replacement: here + "shims/link.tsx" },
    ],
  },
  define: { "process.env.NODE_ENV": '"production"', __ASE_FILES__: JSON.stringify(files) },
  build: {
    outDir: OUT,
    emptyOutDir: false,
    minify: true,
    lib: { entry: here + "islands.tsx", formats: ["iife"], name: "ASEIslands", fileName: () => "islands.js" },
  },
});
