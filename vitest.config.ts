import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  // DB integration tests share one remote Supabase instance, so test files
  // must run sequentially — otherwise one file's cleanup deletes another's data.
  // testTimeout/hookTimeout are generous because DB tests make several
  // sequential round-trips to a remote Supabase (signups, RPCs) — the default
  // 5s is too tight on cold/slow connections.
  test: {
    environment: "jsdom",
    globals: true,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: { alias: { "@": resolve(__dirname, "src") } },
});
