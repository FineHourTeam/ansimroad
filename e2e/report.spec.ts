// S6 여행 리포트 (/r/{token}) — 공개 후기만 · 장소별 사진 · 평균 별점 · 공유 · 코스 만들기 · 링크 안내.
// 여행 완료 상태(completedAt · reportToken · links/{reportToken})를 에뮬레이터에 바로 넣고 화면을 연다.
import { expect, test, type Locator, type Page } from "@playwright/test";
import type { Stop } from "../src/shared/domain/types";
import { hhmm, koreanMonthDay } from "../src/shared/lib/date";
import { writeDocs } from "./support/emulator";
import { seedTrip, TRIP_DATE, ymdFromToday, type SeededTrip } from "./support/fixtures";

const PHOTO_URL = "http://localhost:5174/icons/icon-192.png";
const PUBLIC_TEXT = "바다 바람이 시원해서 부모님이 좋아하셨어요";
const PRIVATE_TEXT = "계단이 많아 다음엔 빼고 싶어요";

const rid = (prefix: string) =>
  `${prefix}${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`.replace(
    /[^A-Za-z0-9]/g,
    "x",
  );

const stopAt = (t: SeededTrip, i: number): Stop => {
  const s = t.course.stops[i];
  if (!s) throw new Error(`코스에 ${String(i + 1)}번째 장소가 없어요`);
  return s;
};

/** 여행일 그 장소 도착 + n분 (한국 시각 ISO) */
const takenAt = (s: Stop, plusMin: number) =>
  `${TRIP_DATE}T${hhmm(s.arriveMin + plusMin)}:00+09:00`;

const photoDoc = (t: SeededTrip, at: string, extra: Record<string, unknown> = {}) => ({
  path: `trips/${t.tripId}/photos/${rid("p")}`,
  data: {
    takenAt: at,
    url: PHOTO_URL,
    width: 192,
    height: 192,
    lat: null,
    lng: null,
    locationStatus: "off",
    by: "senior",
    ...extra,
  },
});

interface SeededReport extends SeededTrip {
  reportToken: string;
}

/** seedTrip 위에 '여행 완료'를 얹는다. writeDocs 는 문서를 통째로 바꾸므로 여행 문서의 칸을 모두 다시 쓴다 */
async function seedReport(
  opts: { expired?: boolean; photos?: boolean; reviews?: boolean } = {},
): Promise<SeededReport> {
  const t = await seedTrip({ expired: opts.expired });
  const reportToken = rid("R");
  const expiresOn = opts.expired ? ymdFromToday(-1) : ymdFromToday(37);
  const expiresAt = new Date(`${expiresOn}T23:59:59+09:00`);
  const at = new Date().toISOString();
  const s0 = stopAt(t, 0);
  const docs: { path: string; data: Record<string, unknown> }[] = [
    {
      path: `trips/${t.tripId}`,
      data: {
        ownerUid: "e2e-seed",
        createdAt: at,
        input: t.input,
        course: JSON.parse(JSON.stringify(t.course)) as Record<string, unknown>,
        memos: {},
        expiresOn,
        expiresAt,
        completedAt: at,
        reportToken,
      },
    },
    { path: `links/${reportToken}`, data: { tripId: t.tripId, role: "report", expiresAt } },
    // 리포트 링크가 읽는 공개본 (앱의 completeTrip 이 쓰는 모양과 같다)
    {
      path: `trips/${t.tripId}/public/report`,
      data: {
        date: t.input.date,
        course: JSON.parse(JSON.stringify(t.course)) as Record<string, unknown>,
        expiresOn,
        completedAt: at,
      },
    },
  ];
  if (opts.reviews !== false) {
    docs.push(
      {
        path: `trips/${t.tripId}/reviews/${s0.place.id}`,
        data: { rating: 5, text: PUBLIC_TEXT, priv: false, at },
      },
      {
        path: `trips/${t.tripId}/reviews/${stopAt(t, 1).place.id}`,
        data: { rating: 1, text: PRIVATE_TEXT, priv: true, at },
      },
    );
  }
  if (opts.photos !== false) {
    // 1장은 찍은 시각으로 첫 장소에, 1장은 자녀가 고른 세 번째 장소에 (stopIndex 가 시각보다 먼저)
    docs.push(photoDoc(t, takenAt(s0, 5)), photoDoc(t, takenAt(s0, 5), { stopIndex: 2 }));
  }
  await writeDocs(docs);
  return { ...t, reportToken };
}

const stopCard = (page: Page, s: Stop) =>
  page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 2, name: s.place.name, exact: true }) });
const statTile = (page: Page, label: string) =>
  page.getByRole("listitem").filter({ hasText: label });
const userPhotos = (scope: Locator) => scope.locator(`img[src="${PHOTO_URL}"]`);

/** 통계 이벤트가 나갔는지: GA4 가 켜져 있으면 dataLayer, 꺼져 있으면(개발 모드) '[통계] 이벤트' 콘솔 줄 */
async function sawEvent(page: Page, consoleLines: string[], name: string): Promise<boolean> {
  if (consoleLines.some((l) => l.includes("[통계]") && l.includes(name))) return true;
  return page.evaluate(
    (n) =>
      ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).some((e) => {
        const args = Array.from(e);
        return args[0] === "event" && args[1] === n;
      }),
    name,
  );
}

test("리포트: 제목 · 공개 후기 · 평균 별점 · 장소별 사진을 보여 주고 나만 보기 후기는 숨긴다", async ({
  page,
}) => {
  const r = await seedReport();
  await page.goto(`/r/${r.reportToken}`);

  const head = `${koreanMonthDay(r.input.date)} ${r.course.title}`;
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(head);
  await expect(page).toHaveTitle(new RegExp(`${head} 여행 리포트`));
  await expect(statTile(page, "다녀온 장소")).toContainText(`${String(r.course.stops.length)}곳`);
  await expect(statTile(page, "남긴 사진")).toContainText("2장");
  await expect(statTile(page, "장소 별점")).toContainText("5.0"); // 나만 보기(1점)는 평균에서 빠진다

  const [s0, s1, s2] = [stopAt(r, 0), stopAt(r, 1), stopAt(r, 2)];
  await expect(stopCard(page, s0).getByText(PUBLIC_TEXT)).toBeVisible();
  await expect(stopCard(page, s0).getByRole("img", { name: "별점 5점" })).toBeVisible();
  await expect(page.getByText(PRIVATE_TEXT)).toHaveCount(0);
  await expect(stopCard(page, s1).getByRole("img", { name: /별점/ })).toHaveCount(0);

  // 히어로: 공개 별점이 가장 높은 장소(첫 장소 5점)의 사진을 앨범 표지로 깐다
  await expect(userPhotos(page.getByRole("banner"))).toHaveCount(1);
  await expect(userPhotos(stopCard(page, s0))).toHaveCount(1);
  await expect(userPhotos(stopCard(page, s1))).toHaveCount(0);
  await expect(userPhotos(stopCard(page, s2))).toHaveCount(1);
  const shown = userPhotos(stopCard(page, s0)).first();
  await shown.scrollIntoViewIfNeeded();
  await expect(shown).toHaveJSProperty("naturalWidth", 192); // 실제로 그려졌다

  // 실시간: 어르신이 사진을 더 올리면 새로고침 없이 늘어난다
  await writeDocs([photoDoc(r, takenAt(s1, 3))]);
  await expect(statTile(page, "남긴 사진")).toContainText("3장");
  await expect(userPhotos(stopCard(page, s1))).toHaveCount(1);
});

test("사진 · 공개 후기가 없으면 빈 안내를 보여 주고, 사진이 올라오면 바로 바뀐다", async ({
  page,
}) => {
  const r = await seedReport({ photos: false, reviews: false });
  await page.goto(`/r/${r.reportToken}`);

  await expect(page.getByText("아직 남긴 사진이 없어요")).toBeVisible();
  await expect(statTile(page, "남긴 사진")).toContainText("0장");
  await expect(statTile(page, "장소 별점")).toContainText("—");
  await expect(page.locator(`img[src="${PHOTO_URL}"]`)).toHaveCount(0);

  await writeDocs([photoDoc(r, takenAt(stopAt(r, 0), 1))]);
  await expect(userPhotos(stopCard(page, stopAt(r, 0)))).toHaveCount(1);
  await expect(userPhotos(page.getByRole("banner"))).toHaveCount(1); // 청록 표지가 사진 표지로 바뀐다
  await expect(page.getByText("아직 남긴 사진이 없어요")).toHaveCount(0);
});

test("공유 시트가 없으면 '리포트 링크 복사하기'가 리포트 주소를 복사한다", async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  const r = await seedReport();
  await page.goto(`/r/${r.reportToken}?utm_source=x`);

  // 공유 버튼은 위 요약과 맨 아래 두 곳 — 위쪽 버튼으로 확인한다
  const copyButtons = page.getByRole("button", { name: "리포트 링크 복사하기" });
  await expect(copyButtons).toHaveCount(2);
  await copyButtons.first().click();
  await expect(page.getByText("리포트 링크를 복사했어요")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(`${String(baseURL)}/r/${r.reportToken}`); // 쿼리는 빼고 리포트 주소만
});

test("공유 시트가 있으면 '카카오톡으로 공유하기'가 리포트 주소로 공유하고 통계를 남긴다", async ({
  page,
  baseURL,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __shared: ShareData[] };
    w.__shared = [];
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (data: ShareData) => {
        w.__shared.push(data);
        return Promise.resolve();
      },
    });
  });
  const events: string[] = [];
  page.on("console", (msg) => {
    events.push(msg.text());
  });
  const r = await seedReport();
  await page.goto(`/r/${r.reportToken}`);

  // 공유 버튼은 위 요약과 맨 아래 두 곳 — 다 보고 내려온 사람이 누르는 아래쪽 버튼으로 확인한다
  const shareButtons = page.getByRole("button", { name: "카카오톡으로 공유하기" });
  await expect(shareButtons).toHaveCount(2);
  await shareButtons.last().click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __shared: ShareData[] }).__shared))
    .toEqual([expect.objectContaining({ url: `${String(baseURL)}/r/${r.reportToken}` })]);
  await expect.poll(() => sawEvent(page, events, "report_share")).toBe(true);
  await expect(page.getByText("리포트 링크를 복사했어요")).toHaveCount(0); // 공유했으면 복사로 넘어가지 않는다
});

test("'안심로드로 코스 만들기'를 누르면 처음 화면으로 간다", async ({ page }) => {
  const r = await seedReport();
  await page.goto(`/r/${r.reportToken}`);

  await page.getByRole("link", { name: "안심로드로 코스 만들기" }).click();
  await expect(page).toHaveURL(/\/\?utm_source=report&utm_medium=share$/);
  await expect(page.getByRole("form", { name: "여행하실 분의 조건을 골라 주세요" })).toBeVisible(); // 처음 화면의 조건 입력
  await expect(page.getByText("안심로드 여행 리포트")).toHaveCount(0);
});

test("글 없이 별점만 남긴 공개 후기는 도착 시각 옆 별점만 보이고 인용 상자는 그리지 않는다", async ({
  page,
}) => {
  const r = await seedReport({ reviews: false });
  const s2 = stopAt(r, 2);
  await writeDocs([
    {
      path: `trips/${r.tripId}/reviews/${s2.place.id}`,
      data: { rating: 4, text: "", priv: false, at: new Date().toISOString() },
    },
  ]);
  await page.goto(`/r/${r.reportToken}`);

  await expect(stopCard(page, s2).getByRole("img", { name: "별점 4점" })).toBeVisible();
  await expect(stopCard(page, s2).locator("blockquote")).toHaveCount(0);
  await expect(statTile(page, "장소 별점")).toContainText("4.0");
});

test("한 장소에 사진이 3장보다 많으면 3장만 보이고 마지막 칸에 남은 장 수를 얹는다", async ({
  page,
}) => {
  const r = await seedReport({ photos: false });
  const s0 = stopAt(r, 0);
  await writeDocs([1, 2, 3, 4, 5].map((m) => photoDoc(r, takenAt(s0, m))));
  await page.goto(`/r/${r.reportToken}`);

  await expect(statTile(page, "남긴 사진")).toContainText("5장");
  await expect(userPhotos(stopCard(page, s0))).toHaveCount(3);
  await expect(stopCard(page, s0).getByText("+2장", { exact: true })).toBeVisible();
});

test("불러오지 못하면 '다시 불러오기'로 다시 시도하고, 그동안 불러오는 중 안내를 보여 준다", async ({
  page,
}) => {
  const r = await seedReport();
  let offline = true;
  // 익명 로그인(인증 에뮬레이터)을 끊어 링크 확인을 실패시킨다. 다시 시도할 때는 조금 늦게 통과시킨다
  await page.route("http://127.0.0.1:9099/**", async (route) => {
    if (offline) {
      await route.abort();
      return;
    }
    await new Promise((done) => setTimeout(done, 1_000));
    await route.continue();
  });
  await page.goto(`/r/${r.reportToken}`);

  await expect(page.getByRole("heading", { name: "리포트를 불러오지 못했어요" })).toBeVisible();
  offline = false;
  await page.getByRole("button", { name: "다시 불러오기" }).click();
  // 데이터가 아직 없던 쿼리는 다시 시도하면 대기 상태로 돌아가 불러오는 중 화면이 뜬다
  await expect(page.getByRole("status").filter({ hasText: "불러오는 중이에요" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "리포트를 불러오지 못했어요" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `${koreanMonthDay(r.input.date)} ${r.course.title}`,
  );
  await expect(page.getByText(PUBLIC_TEXT)).toBeVisible();
});

test("자녀용 링크로 /r 을 열면 리포트 링크 안내를 보여 준다", async ({ page }) => {
  const r = await seedReport();
  await page.goto(`/r/${r.familyToken}`);

  await expect(page.getByRole("heading", { name: "리포트 링크가 아니에요" })).toBeVisible();
  await expect(page.getByText(PUBLIC_TEXT)).toHaveCount(0);
  await page.getByRole("link", { name: "안심로드 둘러보기" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("없는 토큰이면 '리포트를 찾을 수 없어요'", async ({ page }) => {
  await page.goto(`/r/${rid("Rnone")}`);
  await expect(page.getByRole("heading", { name: "리포트를 찾을 수 없어요" })).toBeVisible();
  await expect(page.getByRole("link", { name: "개인정보 처리방침" })).toBeVisible();
});

test("보관 기간이 지난 리포트는 기간 안내를 보여 준다", async ({ page }) => {
  const r = await seedReport({ expired: true });
  await page.goto(`/r/${r.reportToken}`);
  await expect(page.getByRole("heading", { name: "보관 기간이 지난 리포트예요" })).toBeVisible();
  await expect(page.getByText(PUBLIC_TEXT)).toHaveCount(0);
});
