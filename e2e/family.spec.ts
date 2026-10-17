// S5 자녀 현황 · S3 링크 모아 보기 · 인쇄용 — 시드한 여행(seedTrip)으로 화면 동작과 저장 결과를 함께 확인한다.
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { hhmm } from "../src/shared/lib/date";
import { getDoc, listDocs, writeDocs } from "./support/emulator";
import {
  demoNow,
  firstCourse,
  INPUT,
  PHOTO_FILE,
  seedTrip,
  TRIP_DATE,
  ymdFromToday,
} from "./support/fixtures";

/** 여행 당일 hh:mm 시연 시계로 연다 */
const onTripDay = (token: string, time = "12:20") =>
  `/f/${token}?now=${encodeURIComponent(demoNow(TRIP_DATE, time))}`;

// ---- Firestore REST 문서 읽기 도우미 ----
type Rest = Record<string, unknown>;
const obj = (v: unknown): Rest => (v && typeof v === "object" ? (v as Rest) : {});
const fieldsOf = (doc: unknown): Rest => obj(obj(doc).fields);
const mapFields = (v: unknown): Rest => obj(obj(obj(v).mapValue).fields);
const arr = (v: unknown): unknown[] => {
  const values = obj(obj(v).arrayValue).values;
  return Array.isArray(values) ? values : [];
};
const num = (v: unknown): number => Number(obj(v).integerValue ?? obj(v).doubleValue);
const str = (v: unknown): unknown => obj(v).stringValue;
const bool = (v: unknown): unknown => obj(v).booleanValue;

async function savedCourse(tripId: string) {
  const course = mapFields(fieldsOf(await getDoc(`trips/${tripId}`)).course);
  return {
    startMin: num(course.startMin),
    stays: arr(course.stops).map((s) => num(mapFields(s).stayMin)),
    title: str(course.title),
  };
}

async function waitReady(page: Page, title: string) {
  await expect(page.getByLabel("코스 이름 (눌러서 고치기)")).toHaveValue(title);
}

test("당일 화면: 코스 제목 · 장소 · 지금 줄 · 지금쯤 상태", async ({ page }) => {
  const trip = await seedTrip();
  const stop = trip.course.stops[1];
  if (!stop) throw new Error("두 번째 장소 없음");
  const at = hhmm(stop.departMin - 1); // 두 번째 장소에 머무는 중
  await page.goto(onTripDay(trip.familyToken, at));
  await waitReady(page, trip.course.title);
  for (const s of trip.course.stops) {
    await expect(page.getByRole("group", { name: `${s.place.name} 실제 사진` })).toBeVisible();
  }
  // 지금 선은 제 줄에: 시각 표시가 머무는 시간 버튼(과 그 아래 장소 사진)을 덮지 않는다
  await expect(page.getByRole("img", { name: `지금 ${at}` })).toBeVisible();
  const pill = await page.getByText(`지금 ${at}`, { exact: true }).boundingBox();
  const stay = await page
    .getByRole("button", { name: `${stop.place.name} 10분 늘리기` })
    .boundingBox();
  expect(pill?.y ?? 0).toBeGreaterThanOrEqual((stay?.y ?? 0) + (stay?.height ?? Infinity));
  await expect(page.getByText("예정 시각 기준")).toHaveCount(0);
  const banner = page.getByRole("status").filter({ hasText: `지금쯤 ${stop.place.name} 일정` });
  await expect(banner).toContainText("아직 사진은 없어요");
  await expect(page.getByRole("heading", { name: "사진 0장" })).toBeVisible();
  // 당일에는 보내기 카드 대신 바로가기 줄만
  await expect(page.getByText("부모님께 링크를 보내 주세요")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "링크 모아 보기" })).toBeVisible();
});

test("코스 이름 · 출발 시각 · 머무는 시간은 바로 저장되고 새로고침해도 남는다", async ({
  page,
}) => {
  const trip = await seedTrip();
  const first = trip.course.stops[0];
  if (!first) throw new Error("첫 장소 없음");
  const start = trip.course.startMin;
  await page.goto(onTripDay(trip.familyToken));
  await waitReady(page, trip.course.title);

  await page.getByRole("button", { name: "출발 10분 늦추기" }).click();
  await expect(page.getByText(`출발 ${hhmm(start + 10)}`)).toBeVisible();
  const longer = page.getByRole("button", { name: `${first.place.name} 10분 늘리기` });
  await expect(longer).toHaveText("+10분");
  await longer.click();
  await expect(page.getByText(`머무는 시간 ${String(first.stayMin + 10)}분`)).toBeVisible();
  const title = page.getByLabel("코스 이름 (눌러서 고치기)");
  await title.fill("엄마 생신 여행");
  await title.press("Enter");

  await expect
    .poll(async () => {
      const c = await savedCourse(trip.tripId);
      return [c.title, c.startMin, ...c.stays];
    })
    .toEqual([
      "엄마 생신 여행",
      start + 10,
      first.stayMin + 10,
      ...trip.course.stops.slice(1).map((s) => s.stayMin),
    ]);

  await page.reload();
  await waitReady(page, "엄마 생신 여행");
  await expect(page.getByText(`출발 ${hhmm(start + 10)}`)).toBeVisible();
  await expect(page.getByText(`머무는 시간 ${String(first.stayMin + 10)}분`)).toBeVisible();
});

test("장소 칸을 눌러 올린 사진은 그 칸에 붙고 저장된다", async ({ page }) => {
  const trip = await seedTrip();
  const [other, target] = trip.course.stops.map((s) => s.place.name);
  if (!other || !target) throw new Error("장소 2곳 필요");
  await page.goto(onTripDay(trip.familyToken));
  await waitReady(page, trip.course.title);

  await page.getByRole("button", { name: `${target} 사진 올리기` }).click();
  await expect(page.getByRole("dialog", { name: `${target} 사진 올리기` })).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "앨범에서 고르기" }).click();
  await (await chooser).setFiles(PHOTO_FILE);

  const slot = page.getByRole("group", { name: `${target} 실제 사진` });
  await expect(slot.getByText("내가 올린 사진")).toBeVisible();
  await expect(page.getByRole("heading", { name: "사진 1장" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: `${other} 실제 사진` }).getByText("내가 올린 사진"),
  ).toHaveCount(0);

  await expect
    .poll(async () =>
      (await listDocs(`trips/${trip.tripId}/photos`)).map((d) => ({
        by: str(d.fields.by),
        stopIndex: num(d.fields.stopIndex),
        url: typeof str(d.fields.url),
      })),
    )
    .toEqual([{ by: "family", stopIndex: 1, url: "string" }]);

  await page.reload();
  const saved = page.getByRole("group", { name: `${target} 실제 사진` });
  await expect(saved.getByText("내가 올린 사진")).toBeVisible();
  // 고른 칸이 위치 줄에도 그대로 (찍은 시각의 예정 장소가 아니라)
  await expect(saved.getByText(`${target} 칸에 올린 사진`)).toBeVisible();

  await saved.getByRole("button", { name: /사진 크게 보기$/ }).click();
  const viewer = page.getByRole("dialog");
  await expect(viewer.getByRole("img", { name: /사진 원본$/ })).toBeVisible();
  await viewer.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(viewer).toBeHidden();
});

test("부모님이 올린 사진은 찍은 시각의 예정 장소 칸에 실시간으로 보인다", async ({ page }) => {
  const trip = await seedTrip();
  const stop = trip.course.stops[2];
  if (!stop) throw new Error("세 번째 장소 없음");
  await page.goto(onTripDay(trip.familyToken));
  await waitReady(page, trip.course.title);
  await expect(page.getByRole("heading", { name: "사진 0장" })).toBeVisible();

  const takenAt = new Date(`${TRIP_DATE}T${hhmm(stop.arriveMin + 5)}:00+09:00`).toISOString();
  const data = { takenAt, url: "/icons/icon-192.png", width: 192, height: 192, by: "senior" };
  const path = `trips/${trip.tripId}/photos/senior1`;
  await writeDocs([{ path, data: { ...data, lat: null, lng: null, locationStatus: "off" } }]);
  const slot = page.getByRole("group", { name: `${stop.place.name} 실제 사진` });
  await expect(slot.getByText("부모님 사진")).toBeVisible();
  await expect(slot.getByText(`${hhmm(stop.arriveMin + 5)} 사진`)).toBeVisible();
  await expect(slot.getByText(`${stop.place.name} 일정 중에 찍었어요`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "사진 1장" })).toBeVisible();
  const banner = page.getByRole("status").filter({ hasText: "마지막 사진" });
  await expect(banner.locator("p").first()).toHaveText(`지금쯤 ${stop.place.name} 일정`);
  await expect(banner.locator("p").nth(1)).toHaveText(`${hhmm(stop.arriveMin + 5)} 마지막 사진`);
});

test("여행 전: 보내기 카드와 링크 모아 보기에 부모님 링크가 보인다", async ({ page }) => {
  const trip = await seedTrip();
  await page.goto(`/f/${trip.familyToken}`);
  await waitReady(page, trip.course.title);
  const card = page.getByRole("region", { name: "부모님께 링크를 보내 주세요" });
  await expect(card.getByText(`/t/${trip.seniorToken}`)).toBeVisible();
  await expect(card.getByRole("button", { name: "부모님 링크 복사" })).toBeVisible();

  // 바로가기 한 줄(코스 보기·수정 · 링크 모아 보기 · 인쇄 · 이미지)은 보내기 카드 바로 아래
  await page
    .getByRole("navigation", { name: "코스 바로가기" })
    .getByRole("link", { name: "링크 모아 보기" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/f/${trip.familyToken}/share$`));
  await expect(page.getByText(`/t/${trip.seniorToken}`)).toBeVisible();
  await expect(page.getByRole("button", { name: /부모님.*링크.*복사/ })).toHaveCount(1);
  await expect(page.getByText(`/f/${trip.familyToken}`, { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /코스 자세히 보기/ })).toHaveAttribute(
    "href",
    `/f/${trip.familyToken}/course`,
  );
  await expect(page.getByRole("link", { name: "다른 코스 다시 고르기" })).toHaveAttribute(
    "href",
    `/result?p=2&a=70&m=none&w=20&d=${TRIP_DATE}&s=600&t=car`,
  );
  await page.getByRole("link", { name: "인쇄 · 이미지로 보기" }).click();
  await expect(page).toHaveURL(new RegExp(`/f/${trip.familyToken}/print$`));
});

test("공유 창이 없는 기기(카카오톡 인앱 등)는 카카오 버튼 대신 '일정 글 복사'가 일정 글째 복사한다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  const trip = await seedTrip();
  await page.goto(`/f/${trip.familyToken}`);
  await waitReady(page, trip.course.title);
  const card = page.getByRole("region", { name: "부모님께 링크를 보내 주세요" });
  await expect(card.getByRole("button", { name: "카카오톡으로 보내기" })).toHaveCount(0);
  await card.getByRole("button", { name: "일정 글 복사" }).click();
  await expect(
    page.getByText("일정과 부모님 링크를 복사했어요. 카카오톡에 붙여 넣어 주세요"),
  ).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(trip.course.title);
  expect(copied).toContain(trip.course.stops[0]?.place.name ?? "?");
  expect(copied.trimEnd()).toMatch(new RegExp(`/t/${trip.seniorToken}$`)); // 링크는 글 맨 끝
});

test("인쇄용: 이미지 공유가 안 되는 기기는 저장하고, 일정 글은 '글 복사'로 따로 준다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  const trip = await seedTrip();
  await page.goto(`/f/${trip.familyToken}/print`);
  await expect(page.getByRole("heading", { level: 1, name: trip.course.title })).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "이미지로 공유하기" }).click();
  await download;
  await expect(page.getByText(/이미지 공유가 안 돼서 저장했어요/)).toBeVisible();
  await page.getByRole("button", { name: "글 복사" }).click();
  await expect(page.getByText("일정 글을 복사했어요")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(trip.course.title);
});

test("여행 당일에 확정하면 부모님 사진이 오기 전까지 보내기 카드를 보여 준다", async ({ page }) => {
  const today = ymdFromToday(0);
  const trip = await seedTrip({ input: { ...INPUT, date: today } }); // 오늘 확정한 오늘 여행
  await page.goto(`/f/${trip.familyToken}?now=${encodeURIComponent(demoNow(today, "10:05"))}`);
  await waitReady(page, trip.course.title);
  const card = page.getByRole("region", { name: "부모님께 링크를 보내 주세요" });
  await expect(card.getByText(`/t/${trip.seniorToken}`)).toBeVisible();
  await expect(card.getByRole("button", { name: "부모님 링크 복사" })).toBeVisible();

  // 부모님 사진이 오면 링크가 간 것이니 당일 화면대로 카드를 접는다
  const takenAt = new Date(`${today}T10:03:00+09:00`).toISOString();
  const data = { takenAt, url: "/icons/icon-192.png", width: 192, height: 192, by: "senior" };
  await writeDocs([
    {
      path: `trips/${trip.tripId}/photos/senior1`,
      data: { ...data, lat: null, lng: null, locationStatus: "off" },
    },
  ]);
  await expect(page.getByRole("heading", { name: "사진 1장" })).toBeVisible();
  await expect(card).toHaveCount(0);
});

test("인쇄용: 코스 · 시각 · 메모 · 두 링크와 QR을 싣고 인쇄할 때 도구 막대는 숨긴다", async ({
  page,
}) => {
  const first = firstCourse().stops[0];
  if (!first) throw new Error("첫 장소 없음");
  const trip = await seedTrip({ memos: { [first.place.id]: "무릎 담요 챙기기" } });
  await page.goto(`/f/${trip.familyToken}/print`);
  await expect(page.getByRole("heading", { level: 1, name: trip.course.title })).toBeVisible();
  // 화면 밖 이미지 카드(같은 내용)와 섞이지 않게 인쇄 종이 안에서 찾는다
  const sheet = page.getByRole("article");
  for (const s of trip.course.stops) {
    await expect(
      sheet.getByRole("listitem").filter({ hasText: s.place.name }).first(),
    ).toBeVisible();
    await expect(sheet.getByText(hhmm(s.arriveMin), { exact: true }).first()).toBeVisible();
  }
  await expect(sheet.getByText("메모: 무릎 담요 챙기기")).toBeVisible();
  // 휴대폰 폭에서도 전화번호가 '061-' 에서 끊기지 않는다 (한 줄)
  const phone = trip.course.stops.flatMap((s) => s.place.phones)[0] ?? "전화번호 없음";
  expect(
    (await sheet.getByText(phone, { exact: true }).first().boundingBox())?.height,
  ).toBeLessThan(30);
  // 장소마다 주소 한 줄 (모담 요청 2026-10-16)
  await expect(sheet.getByText(first.place.address).first()).toBeVisible();
  // 두 링크는 주소 글자 없이 휴대폰으로 찍어 여는 QR 로만 싣는다
  const links = page.getByRole("region", { name: "링크 주소" });
  await expect(links.getByRole("img", { name: /링크 QR 코드$/ })).toHaveCount(2);
  await expect(links.getByRole("img", { name: "부모님용 링크 QR 코드" })).toBeVisible();
  await expect(links.getByRole("img", { name: "자녀용 링크 QR 코드" })).toBeVisible();
  const printButton = page.getByRole("button", { name: "인쇄하기" });
  await expect(printButton).toBeEnabled();
  await page.emulateMedia({ media: "print" });
  await expect(printButton).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: trip.course.title })).toBeVisible();

  // A4 한 장: 화면의 @page(A4 · 여백 12mm)대로 뽑은 PDF 가 1쪽
  const pdf = (await page.pdf({ preferCSSPageSize: true })).toString("latin1");
  expect(pdf.match(/\/Type\s*\/Page(?!s)/g) ?? []).toHaveLength(1);
});

test("인쇄용: 이미지로 저장하면 가로 1080px PNG 를 받고, 공유하면 PNG 한 장을 넘긴다", async ({
  page,
}) => {
  // 공유 창 대신 넘긴 값만 기록한다 (헤드리스 브라우저에는 파일 공유 창이 없다)
  await page.addInitScript(() => {
    const w = window as unknown as { __shared: unknown[] };
    w.__shared = [];
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (data: { files?: File[]; title?: string; text?: string }) => {
        w.__shared.push({
          title: data.title,
          text: data.text,
          files: (data.files ?? []).map((f) => ({ name: f.name, type: f.type, size: f.size })),
        });
        return Promise.resolve();
      },
    });
  });
  const trip = await seedTrip();
  await page.goto(`/f/${trip.familyToken}/print`);
  await expect(page.getByRole("heading", { level: 1, name: trip.course.title })).toBeVisible();
  const name = `안심로드-${TRIP_DATE}-${trip.course.title.replace(/\s+/g, "-")}.png`;

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "이미지로 저장하기" }).click();
  const file = await download;
  // 안내는 4초 뒤 사라진다: 파일을 읽기 전에 먼저 확인한다 (병렬 실행 때 읽기가 느려 놓치지 않게)
  await expect(page.getByText("일정표 이미지를 저장했어요")).toBeVisible();
  expect(file.suggestedFilename()).toBe(name);
  const png = await readFile(await file.path());
  // PNG 서명 + IHDR 가로(16~19바이트) = 1080
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(png.readUInt32BE(16)).toBe(1080);

  await page.getByRole("button", { name: "이미지로 공유하기" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared))
    .toEqual([
      {
        title: expect.stringContaining(trip.course.title) as unknown,
        // 모담 양식: 제목 줄 · 시간 줄 · 장소마다 '시각 이름 · 주소' · 맨 끝 부모님 링크
        text: expect.stringMatching(
          new RegExp(
            `^\\[안심로드\\] .+ ${trip.course.title} 일정표예요\\n[\\s\\S]*📷 여행 날 사진 남기기: \\S+/t/${trip.seniorToken}$`,
          ),
        ) as unknown,
        files: [{ name, type: "image/png", size: expect.any(Number) as unknown }],
      },
    ]);
  // 글이 빠지는 앱이 있어 공유 뒤 '글 복사' 단추를 띄운다
  await expect(page.getByRole("button", { name: "글 복사" })).toBeVisible();
});

test("여행 완료: 별점 · 후기 저장 → 리포트로 이동", async ({ page }) => {
  const trip = await seedTrip();
  const [a, b] = trip.course.stops;
  if (!a || !b) throw new Error("장소 2곳 필요");
  await page.goto(onTripDay(trip.familyToken));
  await waitReady(page, trip.course.title);

  await page.getByRole("button", { name: "여행 완료" }).click();
  const five = page
    .getByRole("radiogroup", { name: `${a.place.name} 별점` })
    .getByRole("radio", { name: "5점" });
  await five.click();
  // 별은 48px 칸에 맞게 크게 (토글 기본 16px 이 아니라)
  expect((await five.locator("svg").boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(30);
  await page.getByLabel(`${a.place.name} 한 줄 후기`).fill("바다가 참 예뻤어요");
  await page
    .getByRole("radiogroup", { name: `${b.place.name} 별점` })
    .getByRole("radio", { name: "4점" })
    .click();
  await page.getByRole("checkbox", { name: new RegExp(`^${b.place.name}\\s*나만 보기`) }).click();
  await expect(page.getByText("(리포트 · 다른 가족에게 안 보여요)")).toBeVisible();
  await page.getByRole("button", { name: "여행 리포트 만들기" }).click();

  await expect(page).toHaveURL(/\/r\/[A-Za-z0-9]{10,}$/);
  // 완료로 만든 리포트가 실제로 그려진다: 공개 후기만 · 나만 보기(4점)는 숨김
  await expect(page.getByRole("heading", { level: 1 })).toContainText(trip.course.title);
  await expect(page.getByText("바다가 참 예뻤어요")).toBeVisible();
  await expect(page.getByRole("img", { name: "별점 4점" })).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ hasText: "장소 별점" })).toContainText("5.0");
  const reportToken = new URL(page.url()).pathname.split("/").pop() ?? "";
  const doc = fieldsOf(await getDoc(`trips/${trip.tripId}`));
  expect(str(doc.reportToken)).toBe(reportToken);
  expect(typeof str(doc.completedAt)).toBe("string");

  const pub = fieldsOf(await getDoc(`placeReviews/${a.place.id}/items/${trip.tripId}`));
  expect(num(pub.rating)).toBe(5);
  expect(str(pub.text)).toBe("바다가 참 예뻤어요");
  expect(await getDoc(`placeReviews/${b.place.id}/items/${trip.tripId}`)).toBeNull();
  const own = fieldsOf(await getDoc(`trips/${trip.tripId}/reviews/${b.place.id}`));
  expect(num(own.rating)).toBe(4);
  expect(bool(own.priv)).toBe(true);

  // 일정이 끝나기 전에 완료해도 배너는 '여행이 끝났어요'
  await page.goto(onTripDay(trip.familyToken));
  await expect(page.getByRole("status").filter({ hasText: "여행이 끝났어요" })).toBeVisible();
  await expect(page.getByRole("link", { name: /여행 리포트가 만들어졌어요/ })).toHaveAttribute(
    "href",
    `/r/${reportToken}`,
  );
  await expect(page.getByRole("button", { name: "여행 완료" })).toHaveCount(0);
});

test("열 수 없는 링크: 어르신 링크 · 기간 지남 · 없는 링크", async ({ page }) => {
  const trip = await seedTrip();
  await page.goto(`/f/${trip.seniorToken}`);
  await expect(page.getByRole("heading", { name: "링크를 다시 확인해 주세요" })).toBeVisible();
  await expect(page.getByText("‘자녀용 링크’로만 열려요")).toBeVisible();
  await expect(page.getByText(trip.course.title)).toHaveCount(0);

  const old = await seedTrip({ expired: true });
  await page.goto(`/f/${old.familyToken}`);
  await expect(page.getByRole("heading", { name: "기간이 지난 여행이에요" })).toBeVisible();
  await expect(page.getByText(/일 동안만 열려요/)).toBeVisible();

  await page.goto("/f/Fnotexist0000");
  await expect(page.getByRole("heading", { name: "링크를 다시 확인해 주세요" })).toBeVisible();
  await page.goto(`/f/${old.familyToken}/share`);
  await expect(page.getByRole("heading", { name: "기간이 지난 여행이에요" })).toBeVisible();
  await page.goto(`/f/${trip.seniorToken}/print`);
  await expect(page.getByRole("heading", { name: "링크를 다시 확인해 주세요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "인쇄하기" })).toHaveCount(0);
});
