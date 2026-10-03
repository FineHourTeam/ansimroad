/// <reference types="vitest/config" />
// vite.config — 키트 표준(templates/react/vite.config.example.ts) 기준.
// 구성: react + Tailwind v4 + @ 별칭 + vendor 청크 분리 + (선택) Sentry 소스맵.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
// import { sentryVitePlugin } from "@sentry/vite-plugin"; // 소스맵 업로드 붙일 때 주석 해제 (SENTRY_AUTH_TOKEN은 CI 시크릿, VITE_ 금지)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { host: true, port: 5173 },
  build: {
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        // Vite 8(Rolldown)은 함수형 manualChunks만 지원
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules[/\\](firebase|@firebase)[/\\]/.test(id)) return "firebase";
          if (/node_modules[/\\](react|react-dom|react-router|scheduler)[/\\]/.test(id))
            return "react";
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: { provider: "v8" },
    exclude: ["e2e/**", "node_modules/**"],
  },
});
