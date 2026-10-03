// 배포 후 확인: 실제 사이트(https://ansimroad.web.app)에 스모크 스펙만 돌린다 (읽기 위주, 에뮬레이터 · 시드 없음).
// 실행: npm run e2e:prod  (다른 주소: PROD_URL=https://… npm run e2e:prod)
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /smoke\.spec\.ts/,
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: "list",
  use: {
    baseURL: process.env.PROD_URL ?? "https://ansimroad.web.app",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    ...devices["Pixel 7"],
  },
});
