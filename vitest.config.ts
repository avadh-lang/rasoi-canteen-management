import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/domain/**", "src/lib/money.ts"],
      reporter: ["text", "html"],
      thresholds: { branches: 90, lines: 90 },
    },
  },
});
