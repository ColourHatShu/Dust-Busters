import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  // DB integration tests share one remote Supabase instance, so test files
  // must run sequentially — otherwise one file's cleanup deletes another's data.
  test: { environment: "jsdom", globals: true, fileParallelism: false },
  resolve: { alias: { "@": resolve(__dirname, "src") } },
});
