// E2E: Firebase 에뮬레이터(auth · firestore · storage) + vite dev(--mode e2e: 에뮬레이터 연결 · 약도 · 시연 시계)
// 실행 전 global-setup 이 에뮬레이터를 비우고 장소 데이터 · 운영진 계정 · 추천 코스를 넣는다.
// 실행: npm run e2e (사전: npx playwright install chromium, Java 21 — 에뮬레이터용)
import { defineConfig, devices } from "@playwright/test";

const PORT = 5174;
const PROJECT = "modam-5eb63"; // 에뮬레이터는 실제 프로젝트 데이터를 건드리지 않는다

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: "retain-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  projects: [
    // 사용자 화면은 휴대폰 크기로
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: /admin.*\.spec\.ts/ },
    // 운영진 페이지는 PC. 장소 데이터를 바꾸므로 사용자 화면 테스트가 끝난 뒤에 돈다
    {
      name: "admin",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /admin.*\.spec\.ts/,
      dependencies: ["mobile"],
    },
  ],
  webServer: [
    {
      command: `npx firebase emulators:start --only auth,firestore,storage --project ${PROJECT}`,
      url: "http://127.0.0.1:9099",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: "ignore",
    },
    {
      command: `npx vite --mode e2e --port ${String(PORT)} --strictPort`,
      url: `http://localhost:${String(PORT)}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
