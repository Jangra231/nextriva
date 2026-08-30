import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "app"),
    },
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "app/**/*.spec.ts"],
  },
});
