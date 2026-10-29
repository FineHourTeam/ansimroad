// S4 어르신 화면 (/t/{token}): 첫 진입 동의 → 오늘 일정(상태 · 지금 시각 선 · 메모) → 사진 남기기 → 응급실 전화.
// 자녀가 코스를 고치면 새로 고치지 않아도 바뀌고, 링크 오류 · 만료 · 여행 당일이 아닐 때 안내가 나온다.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { paths } from "../src/app/paths";
import { erDisplayName } from "../src/features/senior/seniorView";
import { hhmm } from "../src/shared/lib/date";
import { telHref } from "../src/shared/lib/format";
import { listDocs, writeDocs } from "./support/emulator";
import {
  demoNow,
  firstCourse,
  PHOTO_FILE,
  seedTrip,
  TRIP_DATE,
  ymdFromToday,
} from "./support/fixtures";

/** 어르신 링크를 열고 동의 화면에서 '동의하고 시작' */
async function openSenior(page: Page, token: string, now?: string) {
  await page.goto(
    now ? `${paths.senior(token)}?now=${encodeURIComponent(now)}` : paths.senior(token),
  );
  await page.getByRole("button", { name: "동의하고 시작" }).click();
  await expect(page.getByRole("list", { name: "오늘 일정" })).toBeVisible();
}

const stopItem = (page: Page, name: string) =>
  page.getByRole("list", { name: "오늘 일정" }).getByRole("listitem").filter({ hasText: name });

/** 사진 남기기 → 사진 고르기 창에 테스트 사진 */
async function shoot(page: Page) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "사진 남기기" }).click();
  await (await chooser).setFiles(PHOTO_FILE);
}

type Fields = Record<string, Record<string, unknown> | undefined>;
async function photoDocs(tripId: string): Promise<Fields[]> {
  return (await listDocs(`trips/${tripId}/photos`)).map((d) => d.fields as Fields);
}

const SETTINGS = JSON.parse(readFileSync("public/config/settings.json", "utf8")) as Record<
  string,
  unknown
>;
/** 운영진이 위치 수집을 켠 설정 파일 (F-24) */
async function withLocationOn(page: Page) {
  await page.route("**/config/settings.json", (r) =>
    r.fulfill({ json: { ...SETTINGS, locationCollectionEnabled: true } }),
  );
}

function lunchOf(course: ReturnType<typeof firstCourse>) {
  const lunch = course.stops.find((s) => s.role === "lunch");
  if (!lunch) throw new Error("테스트 코스에 점심이 없어요");
  return lunch;
}

test("동의 화면 → 오늘 일정 · 메모 · 지금 상태와 지금 시각 선 · 응급실 전화", async ({ page }) => {
  const course = firstCourse();
  const [am, lunch, pm] = course.stops;
  if (!am || !lunch || !pm) throw new Error("코스가 4곳이 아니에요");
  const trip = await seedTrip({ memos: { [lunch.place.id]: "덜 짠 메뉴로 부탁드려요" } });

  await page.goto(
    `${paths.senior(trip.seniorToken)}?now=${encodeURIComponent(demoNow(TRIP_DATE, "12:20"))}`,
  );
  // ⓪ 동의 화면: 위치 수집 OFF(기본) → 버튼 1개 + 개인정보 처리방침 링크만
  await expect(page.getByRole("heading", { level: 1 })).toContainText(course.title);
  await expect(page.getByText("수집 항목")).toBeVisible();
  await expect(page.getByText("여행일 30일 뒤 자동으로 지워져요", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "개인정보 처리방침" })).toHaveAttribute(
    "href",
    paths.privacy,
  );
  await expect(page.getByRole("button", { name: "위치 없이 시작" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "위치정보 이용약관" })).toHaveCount(0);
  await page.getByRole("button", { name: "동의하고 시작" }).click();

  // ② 일정: 12:20 은 점심(11:30~12:30) 중 → 오전 장소 완료, 점심 지금 여기
  for (const s of course.stops) await expect(stopItem(page, s.place.name)).toBeVisible();
  await expect(stopItem(page, am.place.name)).toContainText("완료");
  await expect(stopItem(page, lunch.place.name)).toContainText("지금 여기");
  await expect(stopItem(page, lunch.place.name)).toContainText("덜 짠 메뉴로 부탁드려요");
  await expect(stopItem(page, pm.place.name)).not.toContainText("지금 여기");
  const line = page.getByTestId("now-line");
  await expect(line).toHaveCount(1);
  await expect(line).toContainText(/지금 12:2\d/);
  await expect(stopItem(page, lunch.place.name).getByTestId("now-line")).toBeVisible();
  // 선과 시각 표시는 '지금 여기' 글자 아래 빈칸에: 글자를 가로지르지 않는다
  const here = await stopItem(page, lunch.place.name).getByText("지금 여기").boundingBox();
  const lineBox = await line.boundingBox();
  const pillBox = await line.getByText(/지금 12:2\d/).boundingBox();
  if (!here || !lineBox || !pillBox) throw new Error("지금 선이 화면에 없어요");
  expect(lineBox.y).toBeGreaterThanOrEqual(here.y + here.height);
  expect(pillBox.y).toBeGreaterThanOrEqual(here.y + here.height);
  // 일정이 주인공: 아래 고정 띠(사진 남기기 + 응급실)는 화면 높이의 1/4 안, 지금 장소는 띠에 가리지 않는다.
  // 사진 버튼은 높이 120px 이상 (F-17)
  const shootBox = await page.getByRole("button", { name: "사진 남기기" }).boundingBox();
  const vh = page.viewportSize()?.height ?? 0;
  if (!shootBox) throw new Error("사진 남기기 버튼이 화면에 없어요");
  expect(vh - shootBox.y).toBeLessThanOrEqual(vh / 4);
  expect(shootBox.height).toBeGreaterThanOrEqual(120);
  expect(here.y + here.height).toBeLessThanOrEqual(shootBox.y);
  // 본 화면에는 법적 링크가 없다 (F-27)
  await expect(page.getByRole("link", { name: "개인정보 처리방침" })).toHaveCount(0);

  // ④ 응급실 전화 + 약국: 병원 이름은 법인 앞머리 없이 짧게 → 버튼이 두 줄을 넘지 않는다
  if (!course.er) throw new Error("테스트 코스에 응급실이 없어요");
  const er = page.getByRole("link", { name: /응급실 전화/ });
  await expect(er).toHaveAttribute("href", telHref(course.er.phone));
  await expect(er).toContainText(erDisplayName(course.er.name));
  await expect(er).not.toContainText(/의료법인|재단법인/);
  expect((await er.boundingBox())?.height ?? 0).toBeLessThan(100);
  if (!course.pharmacy) throw new Error("테스트 코스에 약국이 없어요");
  await expect(page.getByText(`가까운 약국 · ${course.pharmacy}`)).toBeVisible();

  // 동의는 이 기기에 기억 → 다시 열면 바로 본 화면
  await page.reload();
  await expect(page.getByRole("list", { name: "오늘 일정" })).toBeVisible();
  await expect(page.getByRole("button", { name: "동의하고 시작" })).toHaveCount(0);

  // 오후에 낮은 화면으로 열어도(지난 장소가 위에 쌓여도) 지금 장소가 아래 띠에 가리지 않게 올라온다
  const last = course.stops.at(-1);
  if (!last) throw new Error("코스에 장소가 없어요");
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto(
    `${paths.senior(trip.seniorToken)}?now=${encodeURIComponent(demoNow(TRIP_DATE, hhmm(last.arriveMin + 5)))}`,
  );
  const lastHere = stopItem(page, last.place.name).getByText("지금 여기");
  await expect(lastHere).toBeVisible();
  const shoot = page.getByRole("button", { name: "사진 남기기" });
  await expect
    .poll(async () => {
      const [a, b] = [await lastHere.boundingBox(), await shoot.boundingBox()];
      return !!a && !!b && a.y >= 0 && a.y + a.height <= b.y;
    })
    .toBe(true);
});

test("사진 남기기 → 자녀에게 보냈어요 + 오늘 보낸 수, 사진 문서가 어르신 이름으로 저장", async ({
  page,
}) => {
  const trip = await seedTrip();
  await openSenior(page, trip.seniorToken, demoNow(TRIP_DATE, "12:20"));

  await shoot(page);

  // 보낸 시각은 아랫줄 맨 앞에 오늘 보낸 수와 함께
  const sent = page.getByRole("button", { name: /자녀에게 보냈어요/ });
  await expect(sent).toBeVisible();
  await expect(sent).toHaveClass(/bg-success/); // 보낸 뒤에는 초록
  await expect(sent.getByText(/^12:2\d · 오늘 사진 1장$/)).toBeVisible();
  // 사진 버튼은 보낸 뒤에도 120px 한 줄 배치 그대로 (아래 띠가 들썩이지 않게)
  expect((await sent.boundingBox())?.height ?? 0).toBeLessThanOrEqual(121);

  const docs = await photoDocs(trip.tripId);
  expect(docs).toHaveLength(1);
  const f = docs[0] ?? {};
  expect(f.by?.stringValue).toBe("senior");
  expect(f.locationStatus?.stringValue).toBe("off"); // 위치 수집 OFF: 위치를 저장하지 않는다
  expect(f.lat).toEqual({ nullValue: null });
  expect(String(f.takenAt?.stringValue)).toContain(TRIP_DATE);
  expect(String(f.url?.stringValue)).toContain(trip.tripId);

  // 3초 뒤 버튼은 다시 '사진 남기기'
  await expect(page.getByRole("button", { name: "사진 남기기" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("오늘 사진 1장 보냈어요")).toBeVisible();
});

test("자녀가 코스를 고치면 새로 고치지 않아도 바로 바뀐다", async ({ page, browser }) => {
  const trip = await seedTrip();
  const removed = trip.course.stops[1];
  if (!removed) throw new Error("코스에 장소가 모자라요");
  await openSenior(page, trip.seniorToken, demoNow(TRIP_DATE, "09:00"));
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toContainText(trip.course.title);
  await expect(stopItem(page, removed.place.name)).toHaveCount(1);

  // 자녀는 다른 기기의 자녀 현황에서 바로 고친다 (자녀 권한 · 실제 화면)
  const familyCtx = await browser.newContext();
  try {
    const family = await familyCtx.newPage();
    await family.goto(paths.family(trip.familyToken));
    const title = "엄마랑 바다 나들이";
    const name = family.getByLabel("코스 이름 (눌러서 고치기)");
    await expect(name).toHaveValue(trip.course.title);
    await name.fill(title);
    await name.press("Enter");
    await family.getByRole("button", { name: `${removed.place.name} 더 보기` }).click();
    await family.getByRole("menuitem", { name: "삭제하기" }).click();

    // 어르신 화면은 새로 고치지 않았는데 바뀐다
    await expect(heading).toContainText(title);
    await expect(stopItem(page, removed.place.name)).toHaveCount(0);
  } finally {
    await familyCtx.close();
  }
});

test("여행 당일이 아니면: 전날은 안내 + 상태 없음, 며칠 전은 사진 남기기 잠김", async ({
  page,
}) => {
  const trip = await seedTrip();
  await openSenior(page, trip.seniorToken, demoNow(ymdFromToday(6), "12:20"));
  await expect(page.getByText("내일이 여행 날이에요")).toBeVisible();
  await expect(page.getByText("지금 여기")).toHaveCount(0);
  await expect(page.getByTestId("now-line")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "사진 남기기" })).toBeEnabled(); // ±1일은 시간대 오차로 허용

  await page.goto(
    `${paths.senior(trip.seniorToken)}?now=${encodeURIComponent(demoNow(ymdFromToday(4), "12:20"))}`,
  );
  await expect(page.getByText("여행까지 3일 남았어요")).toBeVisible();
  await expect(page.getByText("여행 당일에 눌러 주세요")).toBeVisible();
  await expect(page.getByRole("button", { name: "사진 남기기" })).toHaveCount(0);

  // 다음날: 사진은 아직 남길 수 있다 (±1일)
  await page.goto(
    `${paths.senior(trip.seniorToken)}?now=${encodeURIComponent(demoNow(ymdFromToday(8), "12:20"))}`,
  );
  await expect(page.getByText("어제가 여행 날이었어요")).toBeVisible();
  await expect(page.getByRole("button", { name: "사진 남기기" })).toBeEnabled();

  // 이틀 뒤: 지난 여행, 사진 남기기 잠김 (더 할 수 없는 '당일에 눌러 주세요' 대신 끝났다고), 장소는 모두 완료
  await page.goto(
    `${paths.senior(trip.seniorToken)}?now=${encodeURIComponent(demoNow(ymdFromToday(9), "12:20"))}`,
  );
  await expect(page.getByText("지난 여행이에요")).toBeVisible();
  await expect(page.getByText("여행이 끝나 사진은 더 보낼 수 없어요")).toBeVisible();
  await expect(page.getByText("여행 당일에 눌러 주세요")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "사진 남기기" })).toHaveCount(0);
  await expect(page.getByTestId("now-line")).toHaveCount(0);
  for (const s of trip.course.stops)
    await expect(stopItem(page, s.place.name)).toContainText("완료");
});

test("위치 수집 ON: 위치 안내에 동의 → 사진에 위치 · 수집 기록, 찍은 곳이 '지금 여기'", async ({
  page,
  context,
}) => {
  const trip = await seedTrip();
  const lunch = lunchOf(trip.course);
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: lunch.place.lat, longitude: lunch.place.lng });
  await withLocationOn(page);
  // 흔한 안드로이드 화면 크기에서도 동의 버튼이 스크롤 없이 보인다
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto(
    `${paths.senior(trip.seniorToken)}?now=${encodeURIComponent(demoNow(TRIP_DATE, "09:00"))}`,
  );

  // ⓪ 위치 안내: 버튼 2개 + 위치정보 이용약관
  await expect(page.getByText("사진, 찍은 시각, 지금 위치")).toBeVisible();
  await expect(page.getByRole("button", { name: "동의하고 시작" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "위치 없이 시작" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "위치정보 이용약관" })).toHaveAttribute(
    "href",
    paths.locationTerms,
  );
  await page.getByRole("button", { name: "동의하고 시작" }).click();
  await expect(page.getByTestId("now-line")).toHaveCount(1);
  await expect(stopItem(page, lunch.place.name)).not.toContainText("지금 여기");

  await shoot(page);
  await expect(page.getByRole("button", { name: /자녀에게 보냈어요/ })).toBeVisible();
  // 점심 장소에서 찍었으니 시각과 상관없이 그곳이 '지금 여기', 시각 선은 숨긴다
  await expect(stopItem(page, lunch.place.name)).toContainText("지금 여기");
  await expect(page.getByTestId("now-line")).toHaveCount(0);
  await expect(page.getByText("위치 없이 저장했어요")).toHaveCount(0);

  const [f] = await photoDocs(trip.tripId);
  expect(f?.locationStatus?.stringValue).toBe("ok");
  expect(Number(f?.lat?.doubleValue)).toBeCloseTo(lunch.place.lat, 4);
  expect(Number(f?.lng?.doubleValue)).toBeCloseTo(lunch.place.lng, 4);
  // D-08 수집 사실 기록 (좌표 없이)
  await expect
    .poll(async () => (await listDocs(`trips/${trip.tripId}/locationLog`)).length)
    .toBe(1);
  const [log] = await listDocs(`trips/${trip.tripId}/locationLog`);
  expect((log?.fields as Fields | undefined)?.action?.stringValue).toBe("collect");
});

test("위치 수집 ON: 위치 권한을 거절하면 위치 없이 저장했어요", async ({ page }) => {
  const trip = await seedTrip();
  await withLocationOn(page);
  await openSenior(page, trip.seniorToken, demoNow(TRIP_DATE, "12:20"));

  await shoot(page);
  await expect(page.getByRole("button", { name: /자녀에게 보냈어요/ })).toBeVisible();
  await expect(page.getByText("위치 없이 저장했어요")).toBeVisible();

  const [f] = await photoDocs(trip.tripId);
  expect(f?.locationStatus?.stringValue).toBe("denied");
  expect(f?.lat).toEqual({ nullValue: null });
  expect(await listDocs(`trips/${trip.tripId}/locationLog`)).toHaveLength(0);
});

test("위치 수집 ON: '위치 없이 시작'이면 위치 없이 사진만 보낸다", async ({ page, context }) => {
  const trip = await seedTrip();
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 34.79, longitude: 126.38 });
  await withLocationOn(page);
  await page.goto(
    `${paths.senior(trip.seniorToken)}?now=${encodeURIComponent(demoNow(TRIP_DATE, "12:20"))}`,
  );
  await page.getByRole("button", { name: "위치 없이 시작" }).click();

  await shoot(page);
  await expect(page.getByRole("button", { name: /자녀에게 보냈어요/ })).toBeVisible();
  const [f] = await photoDocs(trip.tripId);
  expect(f?.locationStatus?.stringValue).toBe("skipped");
  expect(f?.lat).toEqual({ nullValue: null });
  expect(await listDocs(`trips/${trip.tripId}/locationLog`)).toHaveLength(0);
});

test("위치 없는 안내에 동의한 뒤 위치 수집이 켜지면 위치 안내로 다시 묻는다", async ({ page }) => {
  const trip = await seedTrip();
  await openSenior(page, trip.seniorToken, demoNow(TRIP_DATE, "12:20"));
  await withLocationOn(page);
  await page.reload();
  await expect(page.getByText("사진, 찍은 시각, 지금 위치")).toBeVisible();
  await expect(page.getByRole("button", { name: "위치 없이 시작" })).toBeVisible();
});

test("카메라가 사진 없이 닫히면(취소 · 카메라 권한 거부) 카메라 허용 안내, 찍으면 사라진다 (F-18)", async ({
  page,
}) => {
  const trip = await seedTrip();
  await openSenior(page, trip.seniorToken, demoNow(TRIP_DATE, "12:20"));
  const hint = page.getByRole("status").getByText("카메라를 허용해 주세요", { exact: true });
  await expect(hint).toHaveCount(0);

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "사진 남기기" }).click();
  await chooser;
  await page.locator('input[type="file"]').dispatchEvent("cancel");
  await expect(hint).toBeVisible();
  await expect(page.getByText(/휴대폰 설정의 카카오톡에서 카메라를 켜 주세요/)).toBeVisible();

  await shoot(page);
  await expect(page.getByRole("button", { name: /자녀에게 보냈어요/ })).toBeVisible();
  await expect(hint).toHaveCount(0);
});

test("사진을 못 보내면 '다시 눌러 주세요'", async ({ page }) => {
  test.setTimeout(90_000); // 보내기 제한 30초를 기다린다
  const trip = await seedTrip();
  await openSenior(page, trip.seniorToken, demoNow(TRIP_DATE, "12:20"));
  await page.route("**/v0/b/**", (r) => r.abort()); // 사진 저장소 연결 끊김

  await shoot(page);
  await expect(page.getByRole("button", { name: "보내는 중이에요…" })).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 눌러 주세요" })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByText(/오늘 사진 \d+장/)).toHaveCount(0);
  expect(await photoDocs(trip.tripId)).toHaveLength(0);

  // 다시 누르면 사진 고르기 창이 다시 열린다
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "다시 눌러 주세요" }).click();
  await chooser;
});

test("연결이 안 되면 다시 불러오기 → 연결되면 동의 화면", async ({ page }) => {
  const trip = await seedTrip();
  await page.route("**/identitytoolkit.googleapis.com/**", (r) => r.abort());
  await page.goto(paths.senior(trip.seniorToken));
  await expect(
    page.getByRole("heading", { name: "연결을 확인한 뒤 다시 열어 주세요" }),
  ).toBeVisible();

  await page.unroute("**/identitytoolkit.googleapis.com/**");
  await page.getByRole("button", { name: "다시 불러오기" }).click();
  await expect(page.getByRole("button", { name: "동의하고 시작" })).toBeVisible();
});

test("자녀용 링크로 열면 어르신용 링크가 아니라고 알려 준다", async ({ page }) => {
  const trip = await seedTrip();
  await page.goto(paths.senior(trip.familyToken));
  await expect(page.getByRole("heading", { name: "어르신용 링크가 아니에요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "동의하고 시작" })).toHaveCount(0);
});

test("기간이 지난 여행은 만료 안내", async ({ page }) => {
  const trip = await seedTrip({ expired: true });
  await page.goto(paths.senior(trip.seniorToken));
  await expect(page.getByRole("heading", { name: "기간이 지난 여행이에요" })).toBeVisible();
});

test("만료 정리가 끝난 뒤(여행은 지워지고 링크에 role · expiresAt 만 남음)에도 만료 안내", async ({
  page,
}) => {
  // functions cleanupExpiredTrips 가 남기는 모양 그대로: tripId · seniorToken 을 뺀 링크 문서
  const expiresAt = new Date(`${ymdFromToday(-1)}T23:59:59+09:00`);
  // 기기 시계가 서버보다 늦으면 만료 시각이 아직 안 지난 것처럼 보인다 → tripId 가 없는 것만으로 만료로 본다
  const lateClock = new Date(`${ymdFromToday(1)}T23:59:59+09:00`);
  const id = String(Date.now());
  const senior = `GoneSenior${id}`;
  const family = `GoneFamily${id}`;
  await writeDocs([
    { path: `links/${senior}`, data: { role: "senior", expiresAt } },
    { path: `links/${family}`, data: { role: "family", expiresAt: lateClock } },
  ]);
  await page.goto(paths.senior(senior));
  await expect(page.getByRole("heading", { name: "기간이 지난 여행이에요" })).toBeVisible();
  await page.goto(paths.family(family));
  await expect(page.getByRole("heading", { name: "기간이 지난 여행이에요" })).toBeVisible();
});

test("없는 링크는 링크 확인 안내", async ({ page }) => {
  await page.goto(paths.senior("Nope0000000000"));
  await expect(page.getByRole("heading", { name: "링크를 다시 확인해 주세요" })).toBeVisible();
});
