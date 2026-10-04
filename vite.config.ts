/// <reference types="vitest/config" />
// vite.config — 키트 표준(templates/react/vite.config.example.ts) 기준.
// 구성: react + Tailwind v4 + @ 별칭 + vendor 청크 분리 + (선택) Sentry 소스맵.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { relative, sep } from "node:path";
import { fileURLToPath, URL } from "node:url";
// import { sentryVitePlugin } from "@sentry/vite-plugin"; // 소스맵 업로드 붙일 때 주석 해제 (SENTRY_AUTH_TOKEN은 CI 시크릿, VITE_ 금지)

// 루트 바로 아래 파일 (.env* · vite.config.ts · tsconfig*.json · index.html · *.log)
const isRootFile = (p: string) => {
  const rel = relative(fileURLToPath(new URL(".", import.meta.url)), p);
  return rel.includes(".") && !rel.includes(sep);
};

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    // E2E 서버는 루트 파일을 지켜보지 않는다. Windows 에서 에뮬레이터가 루트 firestore-debug.log 에 로그를 쏟으면
    // fs.watch 버퍼가 넘쳐 루트 파일이 모두 '바뀜'으로 잡히고(마지막 접근 시각을 끈 PC 는 chokidar 가 못 거른다),
    // 서버가 재시작·전체 새로고침돼 돌던 테스트가 빈 화면이 된다. 이 파일들을 고쳤으면 E2E 서버를 다시 띄운다.
    watch: { ignored: (p: string) => p.endsWith(".log") || (mode === "e2e" && isRootFile(p)) },
    // 관리자 TourAPI 가져오기: 개발 중에는 Functions 에뮬레이터(npx firebase emulators:start)로 보낸다.
    // 배포에서는 Hosting rewrite(/api/tourapi/** → 함수 tourapi)가 같은 일을 한다.
    proxy: {
      "/api/tourapi": {
        target: "http://127.0.0.1:5001",
        rewrite: (p) => `/modam-5eb63/asia-northeast3/tourapi${p}`,
      },
    },
  },
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
    exclude: ["e2e/**", "functions/**", "node_modules/**"],
  },
}));
