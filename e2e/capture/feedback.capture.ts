// 모담 피드백(2026-10-16) 반영 보고서용 화면 캡처. 테스트가 아니다:
//   SHOTS_DIR=<폴더> npx playwright test -c playwright.capture.config.ts feedback
// 개발 서버(5173: 에뮬레이터 + 네이버 지도 + 시연 시계)에 시연 여행을 넣고 바뀐 화면을 휴대폰 크기로 찍는다.
// 공유 글은 공유 창 대신 넘긴 값을 텍스트 파일로 남긴다. 추억 페이지 사진은 Storage 에뮬레이터에 올린 예시 사진(한국관광공사)이다.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, type Page } from "@playwright/test";
import { writeDocs } from "../support/emulator";
import { demoNow, resultQuery, seedTrip, TRIP_DATE, ymdFromToday } from "../support/fixtures";

const DIR = process.env.SHOTS_DIR ?? ".cache/shots/feedback";
mkdirSync(DIR, { recursive: true });
const BUCKET = "modam-5eb63.firebasestorage.app";

async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(1500); // 지도 타일 · 사진 · 글꼴
}

async function shot(page: Page, name: string, fullPage = false) {
  await settle(page);
  await page.screenshot({ path: join(DIR, `${name}.png`), fullPage });
}

/** 공유 창 대신 넘긴 글을 window.__shared 에 모은다 */
async function recordShares(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __shared: { text?: string; title?: string }[] };
    w.__shared = [];
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (d: { text?: string; title?: string }) => {
        w.__shared.push({ text: d.text, title: d.title });
        return Promise.resolve();
      },
    });
  });
}

async function lastShare(page: Page): Promise<{ text?: string; title?: string }> {
  await page.waitForFunction(
    () => (window as unknown as { __shared: unknown[] }).__shared.length > 0,
  );
  return page.evaluate(() => {
    const list = (window as unknown as { __shared: { text?: string; title?: string }[] }).__shared;
    return list[list.length - 1] ?? {};
  });
}

/** 장소 사진을 받아 Storage 에뮬레이터에 올리고 앱이 쓰는 다운로드 주소를 돌려준다 */
async function uploadPhoto(tripId: string, id: string, src: string): Promise<string> {
  const img = Buffer.from(await (await fetch(src)).arrayBuffer());
  const name = `trips/${tripId}/photos/${id}.jpg`;
  const res = await fetch(
    `http://127.0.0.1:9199/v0/b/${BUCKET}/o?name=${encodeURIComponent(name)}`,
    {
      method: "POST",
      headers: { Authorization: "Bearer owner", "Content-Type": "image/jpeg" },
      body: img,
    },
  );
  if (!res.ok) throw new Error(`사진 올리기 실패 ${String(res.status)}`);
  // 앱이 받는 다운로드 주소처럼 토큰을 붙인다 (토큰 없는 주소는 보안 규칙에 막힌다)
  let token = ((await res.json()) as { downloadTokens?: string }).downloadTokens;
  if (!token) {
    token = `capture-${id}`;
    await fetch(`http://127.0.0.1:9199/v0/b/${BUCKET}/o/${encodeURIComponent(name)}`, {
      method: "PATCH",
      headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: { firebaseStorageDownloadTokens: token } }),
    });
  }
  return `http://127.0.0.1:9199/v0/b/${BUCKET}/o/${encodeURIComponent(name)}?alt=media&token=${token}`;
}

/** 여행 완료 + 장소마다 사진 · 멘트 (추억 페이지) */
async function seedMemories() {
  const trip = await seedTrip();
  const at = (hhmm: string) => new Date(`${TRIP_DATE}T${hhmm}:00+09:00`).toISOString();
  const lines = [
    { t: "10:25", text: "아버지가 케이블카를 제일 좋아하셨어요.\n바다 위를 지날 때 박수까지!" },
    { t: "11:48", text: "엄마도 맵지 않다며 한 그릇 뚝딱." },
    { t: "13:05", text: "벤치에 앉아 바닷바람 맞으며 한참 쉬었어요." },
    { t: "13:50", text: "다음엔 우리 가족 다 같이 오자!" },
  ];
  const photos: { path: string; data: Record<string, unknown> }[] = [];
  for (const [i, s] of trip.course.stops.entries()) {
    const src = s.place.photoUrls[0];
    const line = lines[i];
    if (!src || !line) continue;
    const url = await uploadPhoto(trip.tripId, `m${String(i)}`, src);
    photos.push({
      path: `trips/${trip.tripId}/photos/m${String(i)}`,
      data: {
        takenAt: at(line.t),
        url,
        width: 1200,
        height: 800,
        lat: null,
        lng: null,
        locationStatus: "off",
        stopIndex: i,
        by: "senior",
      },
    });
  }
  const reportToken = `R${trip.tripId.slice(-11)}`.padEnd(12, "x");
  const expiresOn = ymdFromToday(37);
  await writeDocs([
    {
      path: `trips/${trip.tripId}`,
      data: {
        ownerUid: "e2e-seed",
        createdAt: new Date().toISOString(),
        input: trip.input,
        course: JSON.parse(JSON.stringify(trip.course)) as Record<string, unknown>,
        memos: {},
        expiresOn,
        expiresAt: new Date(`${expiresOn}T23:59:59+09:00`),
        completedAt: new Date().toISOString(),
        reportToken,
      },
    },
    ...photos,
    ...trip.course.stops.map((s, i) => ({
      path: `trips/${trip.tripId}/reviews/${s.place.id}`,
      data: { rating: 5, text: lines[i]?.text ?? "", priv: i === 1, at: new Date() },
    })),
  ]);
  return trip;
}

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 390, height: 844 } });

test("피드백 반영 화면", async ({ page }) => {
  test.setTimeout(300_000);
  const trip = await seedTrip();

  // A. 메인: 슬로건 · 질문 묶음 · 남은 항목
  await page.goto("/");
  await shot(page, "a1-home-hero");
  await page
    .getByRole("list", { name: "이용 순서" })
    .screenshot({ path: join(DIR, "a1b-steps.png") });
  const bar = page.locator("#remaining").locator("..");
  await bar.screenshot({ path: join(DIR, "a3b-bar-all.png") });
  await page.locator("#trip-form").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -12));
  await shot(page, "a2-questions");
  await page.getByRole("radio", { name: "2명" }).click();
  await page.getByRole("radio", { name: "70대" }).click();
  await page.locator("#field-walk").scrollIntoViewIfNeeded();
  await shot(page, "a3-remaining");
  await page.locator("#field-mobility").screenshot({ path: join(DIR, "a4-mobility.png") });
  await page.getByRole("radio", { name: /문제없음/ }).click();
  await page.getByRole("radio", { name: "20분" }).click();
  await page.getByRole("radio", { name: "자가용" }).click();
  await bar.screenshot({ path: join(DIR, "a3b-bar-date.png") });

  // C. 코스 카드 테마 띠
  await page.goto(`/result?${resultQuery()}`);
  await settle(page);
  const cards = page.getByRole("article").filter({ has: page.getByRole("heading", { level: 2 }) });
  const n = await cards.count();
  for (let i = 0; i < Math.min(n, 3); i += 1) {
    await cards.nth(i).screenshot({ path: join(DIR, `c1-card-${String(i)}.png`) });
  }

  // C · D. 코스 상세: 테마 · 번호 · 지도 · 응급·편의 정보 · 주소 · 길찾기
  await page.goto(`/result/${encodeURIComponent(trip.course.key)}?${resultQuery()}`);
  await shot(page, "c2-detail-top");
  await page
    .getByRole("article")
    .first()
    .screenshot({ path: join(DIR, "d1-place-block.png") });
  const safety = page.getByRole("heading", { name: "응급·편의 정보" }).locator("..");
  await safety.scrollIntoViewIfNeeded();
  await safety.screenshot({ path: join(DIR, "c3-safety.png") });
  await page.goto(`/result/history?${resultQuery()}`);
  await shot(page, "c2-detail-history");
  await page.goto(`/result/nature?${resultQuery()}`);
  await shot(page, "c2-detail-nature");

  // D. 자녀 화면: 장소마다 주소 · 주소 복사 · 길찾기
  await page.goto(`/f/${trip.familyToken}?now=${encodeURIComponent(demoNow(TRIP_DATE, "12:20"))}`);
  await settle(page);
  const row = page.getByRole("list").filter({ hasText: "주소 복사" }).getByRole("listitem").first();
  await row.scrollIntoViewIfNeeded();
  await row.screenshot({ path: join(DIR, "d2-family-row.png") });
  await page
    .getByTestId("map-view")
    .first()
    .screenshot({ path: join(DIR, "c4-family-map.png") });

  // F. 공유 글 (부모님 링크 · 일정표)
  await recordShares(page);
  await page.goto(`/f/${trip.familyToken}/share`);
  await settle(page);
  await page.getByRole("button", { name: "카카오톡으로 보내기" }).first().click();
  writeFileSync(join(DIR, "f1-senior-share.txt"), (await lastShare(page)).text ?? "");
  await page.goto(`/f/${trip.familyToken}/print`);
  await shot(page, "d3-print", true);
  // 진단: 가로 넘침 · 아래 띠 단추가 실제로 눌리는 자리인지 (E2E '이미지로 저장하기' 클릭이 main 에 가로막히는 문제)
  const diag = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.includes("이미지로 저장하기"),
    );
    const r = btn?.getBoundingClientRect();
    const hit = r ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      visual: window.visualViewport?.width,
      button: r && { x: r.x, y: r.y, w: r.width, h: r.height },
      hit: hit ? `${hit.tagName}.${String(hit.className).slice(0, 60)}` : null,
      hitInButton: !!(hit && btn?.contains(hit)),
    };
  });
  writeFileSync(join(DIR, "diag-print.json"), JSON.stringify(diag, null, 2));
  await page.getByRole("button", { name: "이미지로 공유하기" }).click();
  writeFileSync(join(DIR, "f2-schedule-share.txt"), (await lastShare(page)).text ?? "");
  await page.getByRole("button", { name: "글 복사" }).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(DIR, "f3-copy-toast.png") });

  // D. 부모님 화면: 일정 카드마다 주소 (누르는 단추는 그대로 두 개)
  await page.addInitScript((t) => {
    localStorage.setItem(`sr.consent.${t}`, "agree");
  }, trip.seniorToken);
  await page.goto(`/t/${trip.seniorToken}?now=${encodeURIComponent(demoNow(TRIP_DATE, "11:40"))}`);
  await shot(page, "d4-senior");

  // E. 여행 추억 페이지
  const done = await seedMemories();
  await page.goto(`/f/${done.familyToken}?now=${encodeURIComponent(demoNow(TRIP_DATE, "16:00"))}`);
  await shot(page, "e1-family-done");
  await page.getByRole("link", { name: /추억 페이지 보기·인쇄/ }).click();
  await page.getByRole("article", { name: "여행 추억 페이지" }).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await shot(page, "e2-memories-top");
  await page
    .getByRole("article", { name: "여행 추억 페이지" })
    .first()
    .screenshot({ path: join(DIR, "e2-memories.png") });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "이미지 저장" }).click();
  await (await download).saveAs(join(DIR, "e3-memories-image.png"));
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: join(DIR, "e4-memories-a4.pdf"),
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
});
