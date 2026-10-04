// 화면 캡처 전용 (테스트 아님): npm run capture. 개발 서버(5173: 에뮬레이터 + 네이버 지도 + 시연 시계)를 띄우거나 이미 떠 있으면 쓴다.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/capture",
  testMatch: /\.capture\.ts$/,
  globalSetup: "./e2e/global-setup.ts",
  reporter: "list",
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    ...devices["iPhone 13"],
    browserName: "chromium",
    deviceScaleFactor: 2,
  },
  webServer: [
    {
      command: "npx firebase emulators:start --only auth,firestore,storage --project modam-5eb63",
      url: "http://127.0.0.1:9099",
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: "ignore",
    },
    {
      command: "npx vite --port 5173 --strictPort",
      url: "http://localhost:5173",
      reuseExistingServer: true,
    },
  ],
});
