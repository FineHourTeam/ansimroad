// 화면 캡처 (디자인 점검 · 소개 자료용). 테스트가 아니다: npm run capture → SHOTS_DIR(기본 .cache/shots)에 PNG.
// 개발 서버(5173, 에뮬레이터 + 네이버 지도)에 시연 데이터를 넣고 휴대폰 크기로 모든 화면, 운영진은 PC 크기로 찍는다.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test, type Page } from "@playwright/test";
import { loginAsAdmin } from "../support/admin";
import { writeDocs } from "../support/emulator";
import {
  CURATED_TITLE,
  demoNow,
  resultQuery,
  seedTrip,
  TRIP_DATE,
  ymdFromToday,
} from "../support/fixtures";

const DIR = process.env.SHOTS_DIR ?? ".cache/shots";
mkdirSync(DIR, { recursive: true });

async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(1200); // 지도 타일 · 사진이 그려질 시간
  await page.screenshot({ path: join(DIR, `${name}.png`), fullPage });
}

/** 여행을 넣고 사진 · 후기 · 리포트(여행 완료)까지 채운다 */
async function seedFullTrip() {
  const memos: Record<string, string> = {};
  const trip = await seedTrip({ memos });
  const [s0, s1, s2] = trip.course.stops;
  if (!s0 || !s1 || !s2) throw new Error("장소 3곳 필요");
  memos[s0.place.id] = "케이블카는 앉아서 가요. 내려서 물 한 병 꼭 챙기세요";
  const at = (hhmm: string) => `${TRIP_DATE}T${hhmm}:00+09:00`;
  const photos = [
    { stop: 0, t: "10:55", url: s0.place.photoUrls[0] },
    { stop: 0, t: "11:10", url: s0.place.photoUrls[1] ?? s0.place.photoUrls[0] },
    { stop: 1, t: "11:50", url: s1.place.photoUrls[0] },
  ].filter((p): p is { stop: number; t: string; url: string } => !!p.url);
  const reportToken = `R${trip.tripId.slice(-11)}`.padEnd(12, "x");
  const expiresOn = ymdFromToday(37);
  const expiresAt = new Date(`${expiresOn}T23:59:59+09:00`);
  const course = JSON.parse(JSON.stringify(trip.course)) as Record<string, unknown>;
  await writeDocs([
    {
      path: `trips/${trip.tripId}`,
      data: {
        ownerUid: "e2e-seed",
        createdAt: new Date().toISOString(),
        input: trip.input,
        course,
        memos,
        expiresOn,
        expiresAt,
      },
    },
    ...photos.map((p, i) => ({
      path: `trips/${trip.tripId}/photos/p${String(i)}`,
      data: {
        takenAt: new Date(at(p.t)).toISOString(),
        url: p.url,
        width: 1200,
        height: 800,
        lat: null,
        lng: null,
        locationStatus: "off",
        stopIndex: p.stop,
        by: "senior",
      },
    })),
  ]);
  // 리포트용으로는 같은 코스를 한 번 더 넣고 완료 상태로
  const done = await seedTrip({ memos });
  await writeDocs([
    {
      path: `trips/${done.tripId}`,
      data: {
        ownerUid: "e2e-seed",
        createdAt: new Date().toISOString(),
        input: done.input,
        course,
        memos,
        expiresOn,
        expiresAt,
        completedAt: new Date().toISOString(),
        reportToken,
      },
    },
    { path: `links/${reportToken}`, data: { tripId: done.tripId, role: "report", expiresAt } },
    {
      path: `trips/${done.tripId}/public/report`,
      data: { date: done.input.date, course, expiresOn, completedAt: new Date().toISOString() },
    },
    {
      path: `trips/${done.tripId}/reviews/${s0.place.id}`,
      data: {
        rating: 5,
        text: "어머니가 케이블카에서 내려다본 바다를 제일 좋아하셨어요",
        priv: false,
        at: new Date(),
      },
    },
    {
      path: `trips/${done.tripId}/reviews/${s1.place.id}`,
      data: { rating: 4, text: "자리가 넓고 화장실이 가까워요", priv: false, at: new Date() },
    },
    ...photos.map((p, i) => ({
      path: `trips/${done.tripId}/photos/p${String(i)}`,
      data: {
        takenAt: new Date(at(p.t)).toISOString(),
        url: p.url,
        width: 1200,
        height: 800,
        lat: null,
        lng: null,
        locationStatus: "off",
        stopIndex: p.stop,
        by: "senior",
      },
    })),
  ]);
  return { trip, reportToken };
}

test.describe.configure({ mode: "serial" });

test("휴대폰 화면", async ({ page }) => {
  test.setTimeout(240_000);
  const { trip, reportToken } = await seedFullTrip();
  const now = `?now=${encodeURIComponent(demoNow(TRIP_DATE, "12:20"))}`;

  await page.goto("/");
  await shot(page, "01-home");
  await shot(page, "01-home-full", true);
  await page.goto(`/result?${resultQuery()}`);
  await shot(page, "02-result");
  await shot(page, "02-result-full", true);
  const first = trip.course.key;
  await page.goto(`/result/${encodeURIComponent(first)}?${resultQuery()}`);
  await shot(page, "03-detail");
  await shot(page, "03-detail-full", true);
  await page.goto(`/f/${trip.familyToken}${now}`);
  await shot(page, "04-family");
  await shot(page, "04-family-full", true);
  await page.goto(`/f/${trip.familyToken}/print`);
  await shot(page, "06-print", true);

  await page.addInitScript((t) => {
    localStorage.setItem(`sr.consent.${t}`, "agree");
  }, trip.seniorToken);
  await page.goto(`/t/${trip.seniorToken}${now}`);
  await shot(page, "08-senior");
  await shot(page, "08-senior-full", true);
  await page.goto(`/r/${reportToken}`);
  await shot(page, "09-report");
  await shot(page, "09-report-full", true);
  await page.goto("/admin/login");
  await shot(page, "10-admin-login");
});

// 소개 자료용: 화면 높이를 실제 휴대폰(390 × 844)에 맞춰 여행 끝 장면(여행 완료 → 별점)과 부모님 화면을 찍는다
test.describe("소개 자료", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("여행 완료 · 별점 · 부모님 화면", async ({ page }) => {
    test.setTimeout(120_000);
    const trip = await seedTrip();
    const evening = `?now=${encodeURIComponent(demoNow(TRIP_DATE, "15:30"))}`;
    await page.goto(`/f/${trip.familyToken}${evening}`);
    const done = page.getByRole("button", { name: "여행 완료" });
    await done.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 160)); // 칸이 화면 가운데쯤 오게
    await shot(page, "11-complete");
    await done.click();
    await page.getByText("여행 리포트 만들기").waitFor();
    // 첫 장소에 별 다섯 개
    await page
      .getByRole("radio")
      .nth(4)
      .click()
      .catch(() => undefined);
    await shot(page, "12-rate");

    await page.addInitScript((t) => {
      localStorage.setItem(`sr.consent.${t}`, "agree");
    }, trip.seniorToken);
    await page.goto(
      `/t/${trip.seniorToken}?now=${encodeURIComponent(demoNow(TRIP_DATE, "11:40"))}`,
    );
    await shot(page, "13-senior");
    await page.getByRole("heading", { name: "오늘 다닐 곳" }).scrollIntoViewIfNeeded();
    await shot(page, "14-senior-map");
  });
});

test.describe("PC", () => {
  test.use({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });
  test("운영진 화면", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsAdmin(page);
    await shot(page, "11-admin-courses");
    await page.getByText(CURATED_TITLE).first().click();
    await shot(page, "12-admin-course-edit", true);
    await page.goto("/admin/places");
    await shot(page, "13-admin-places");
  });
});
