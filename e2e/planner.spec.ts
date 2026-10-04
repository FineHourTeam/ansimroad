// 코스 짜기 — S1 조건 입력 · S2 코스 제안 · S2-1 상세(메모 · 확정) · 확정 후 코스 수정(/f/:token/course)
import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { parseCsv } from "../src/shared/data/csv";
import { recordsToPlaces, toRecords } from "../src/shared/data/placeRecords";
import { longDate } from "../src/shared/lib/date";
import { getDoc, PROJECT, writeDocs } from "./support/emulator";
import {
  CURATED_TITLE,
  INPUT,
  TRIP_DATE,
  firstCourse,
  resultQuery,
  seedTrip,
} from "./support/fixtures";

type Fields = Record<string, unknown>;
const field = (o: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>((v, k) => (v as Fields | undefined)?.[k], o);
const num = (v: unknown): number => Number(field(v, "integerValue") ?? field(v, "doubleValue"));

/** 에뮬레이터에 저장된 여행의 코스 (이름 · 장소 이름 · 머무는 시간) */
async function savedCourse(tripId: string) {
  const doc = await getDoc(`trips/${tripId}`);
  const course = field(doc, "fields", "course", "mapValue", "fields");
  const stops = (field(course, "stops", "arrayValue", "values") ?? []) as unknown[];
  const stop = (s: unknown) => field(s, "mapValue", "fields");
  return {
    title: String(field(course, "title", "stringValue")),
    names: stops.map((s) =>
      String(field(stop(s), "place", "mapValue", "fields", "name", "stringValue")),
    ),
    stays: stops.map((s) => num(field(stop(s), "stayMin"))),
    startMin: num(field(course, "startMin")),
  };
}

/** 테스트가 넣은 문서를 지운다 (에뮬레이터 관리자 토큰) */
async function deleteDoc(path: string): Promise<void> {
  const url = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;
  const res = await fetch(url, { method: "DELETE", headers: { Authorization: "Bearer owner" } });
  if (!res.ok) throw new Error(`문서 지우기 실패 (${String(res.status)})`);
}

const demoPlaces = () =>
  recordsToPlaces(toRecords(parseCsv(readFileSync("public/data/places.demo.csv", "utf8")))).places;

/** 엔진이 만든 코스 카드의 동선 (운영진 추천 카드는 h3 라서 빠진다 — 다른 테스트가 추천 코스를 넣어도 흔들리지 않게) */
const routes = (page: Page) =>
  page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { level: 2 }) })
    .getByTestId("course-route");
const isResult = (query: string) => (url: URL) =>
  url.pathname === "/result" && url.search === `?${query}`;

// ⑩ 빈 칸이 있으면 aria-disabled 지만 눌러서 첫 미입력 항목 안내를 받는다 (Playwright 는 aria-disabled 를 못 누르는 것으로 본다)
const submit = (page: Page) =>
  page.getByRole("button", { name: "코스 3개 만들기" }).click({ force: true });

test("S1: 빈 칸은 첫 미입력 항목으로 안내하고, 다 고르면 코스 3개로 간다", async ({ page }) => {
  await page.goto("/");
  await submit(page);
  await expect(page.locator("#field-party").getByText("선택해 주세요")).toBeVisible();
  await expect(
    page.getByRole("radiogroup", { name: "누구와 가시나요?" }).getByRole("radio").first(),
  ).toBeFocused();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("radio", { name: "2명" }).click();
  await page.getByRole("radio", { name: "70대" }).click();
  await page.getByRole("radio", { name: /문제없음/ }).click();
  await page.getByRole("radio", { name: "20분" }).click();
  await page.getByRole("radio", { name: "자가용" }).click();

  // 이 탭에 임시 저장 (F-03): 새로고침해도 고른 값이 남는다
  await page.reload();
  await expect(page.getByRole("radio", { name: "2명" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "자가용" })).toHaveAttribute("aria-checked", "true");

  // 날짜만 비었으면 날짜 칸으로
  await submit(page);
  await expect(page.locator("#field-date").getByText("선택해 주세요")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "언제 가시나요?" })).toBeFocused();

  await page.getByRole("textbox", { name: "언제 가시나요?" }).fill(TRIP_DATE);
  await submit(page);
  await expect(page).toHaveURL(isResult(resultQuery(INPUT)));
  await expect(page.getByRole("heading", { name: firstCourse().title, level: 2 })).toBeVisible();
});

test("S2: 같은 주소는 새로고침해도 같은 코스, 다른 코스 보기는 본 장소를 빼고 다시 만든다", async ({
  page,
}) => {
  await page.goto(`/result?${resultQuery()}`);
  await expect(routes(page).first()).toBeVisible();
  const before = await routes(page).allTextContents();
  expect(before.join()).toContain(firstCourse().stops[0]?.place.name ?? "?");

  await page.reload();
  await expect(routes(page).first()).toBeVisible();
  expect(await routes(page).allTextContents()).toEqual(before);

  await page.getByRole("button", { name: "다른 코스 보기" }).click();
  await expect(page).toHaveURL(/[?&]ex=/);
  const ex = new URL(page.url()).searchParams.get("ex")?.split(",") ?? [];
  expect(ex).toEqual(expect.arrayContaining(firstCourse().stops.map((s) => s.place.id)));
  const shortage = page.getByRole("heading", {
    name: "이 조건으로 만들 수 있는 코스는 모두 보여 드렸어요",
  });
  await expect(async () => {
    const changed = (await routes(page).allTextContents()).join() !== before.join();
    expect((await shortage.isVisible()) || changed).toBe(true);
  }).toPass();

  // 장소가 모자라면 처음 코스로 돌아갈 수 있다
  if (await shortage.isVisible()) {
    await page.getByRole("link", { name: "처음 코스로 돌아가기" }).click();
    await expect(page).toHaveURL(isResult(resultQuery()));
    await expect(routes(page).first()).toBeVisible();
    expect(await routes(page).allTextContents()).toEqual(before);
  }
});

test("S2: 다른 코스 보기로 장소를 다 쓰면 그렇게 안내하고, 운영진 추천 코스는 그대로 보여 준다", async ({
  page,
}) => {
  const all = demoPlaces().map((p) => p.id);
  await page.goto(`/result?${resultQuery()}&ex=${all.join(",")}`);
  await expect(
    page.getByRole("heading", { name: "이 조건으로 만들 수 있는 코스는 모두 보여 드렸어요" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "모담팀 추천 코스", level: 2 })).toBeVisible();
  await expect(page.getByRole("article", { name: CURATED_TITLE })).toBeVisible();
  await expect(page.getByRole("button", { name: "다른 코스 보기" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "처음 코스로 돌아가기" })).toBeVisible();
});

test("S2: 조건에 맞는 장소가 모자라도 운영진 추천 코스가 있으면 '부족해요' 카드 없이 추천 코스만", async ({
  page,
}) => {
  await page.goto(`/result?${resultQuery({ ...INPUT, age: 50, transport: "transit" })}`);
  await expect(page.getByRole("article", { name: CURATED_TITLE })).toBeVisible();
  await expect(page.getByText("조건에 맞는 확인된 장소가 아직 부족해요")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "처음 코스로 돌아가기" })).toHaveCount(0);
});

test("S2 요약 줄을 누르면 S1이 고른 값 그대로 열리고 주소는 비운다 (F-03)", async ({ page }) => {
  await page.goto(`/result?${resultQuery()}`);
  await page.getByRole("link", { name: /수정/ }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/" && url.search === "");
  await expect(page.getByRole("radio", { name: "2명" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "자가용" })).toHaveAttribute("aria-checked", "true");
  // 날짜 칸은 기본 형식(yyyy-mm-dd) 대신 한국어 날짜를 보여 준다
  await expect(page.locator("#field-date").getByText(longDate(TRIP_DATE))).toBeVisible();
});

test("S2: 운영진 추천 코스가 보이고 상세로 열린다", async ({ page }) => {
  await page.goto(`/result?${resultQuery()}`);
  const card = page.getByRole("article", { name: CURATED_TITLE });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "자세히 보기" }).click();
  await expect(page).toHaveURL(/\/result\/c-[^?]+\?/);
  await expect(page.getByRole("heading", { name: CURATED_TITLE, level: 2 })).toBeVisible();
  await expect(page.getByText("운영진이 직접 걸어 본 길이에요").first()).toBeVisible();
  await expect(page.getByTestId("map-view")).toBeVisible();
});

test("S2-1: 지도 · 장소 정보를 보여 주고, 메모는 새로고침해도 남는다", async ({ page }) => {
  const course = firstCourse();
  const first = course.stops[0];
  if (!first) throw new Error("코스에 장소가 없어요");
  await page.goto(`/result/${course.key}?${resultQuery()}`);
  await expect(page.getByTestId("map-view")).toBeVisible();
  await expect(page.getByRole("heading", { name: "코스 상세", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: course.title, level: 2 })).toBeVisible();
  const block = page.getByRole("article", { name: first.place.name });
  await expect(block.getByRole("heading", { name: first.place.name, level: 3 })).toBeVisible();
  await expect(block.getByText(`머무는 시간 ${String(first.stayMin)}분`)).toBeVisible();
  await expect(block.getByRole("link", { name: /지도 보기/ })).toBeVisible();

  await block.getByRole("button", { name: "메모 남기기" }).click();
  await block.getByLabel("메모", { exact: true }).fill("입구에서 휠체어 빌리기");
  await page.reload();
  await expect(
    page.getByRole("article", { name: first.place.name }).getByLabel("메모", { exact: true }),
  ).toHaveValue("입구에서 휠체어 빌리기");
});

test("S2-1 확정: 자녀 화면으로 가고 여행 · 링크 문서에 코스와 공유 메모가 저장된다", async ({
  page,
}) => {
  const course = firstCourse();
  const first = course.stops[0];
  if (!first) throw new Error("코스에 장소가 없어요");
  await page.goto(`/result/${course.key}?${resultQuery()}`);
  const block = page.getByRole("article", { name: first.place.name });
  await block.getByRole("button", { name: "메모 남기기" }).click();
  await block.getByLabel("메모", { exact: true }).fill("아버지 입맛에 맞는 메뉴");
  await block.getByLabel("나만 보기").click(); // 끄면 확정 때 어르신·가족 화면에도 나간다
  await expect(block.getByLabel("나만 보기")).not.toBeChecked();

  await page.getByRole("button", { name: "이 코스로 확정하기" }).click();
  await expect(page).toHaveURL(/\/f\/[A-Za-z0-9]{10,}$/);
  const token = new URL(page.url()).pathname.split("/").pop() ?? "";

  const link = await getDoc(`links/${token}`);
  expect(field(link, "fields", "role", "stringValue")).toBe("family");
  const tripId = String(field(link, "fields", "tripId", "stringValue"));
  const trip = await getDoc(`trips/${tripId}`);
  expect(trip).not.toBeNull();
  expect((await savedCourse(tripId)).title).toBe(course.title);
  expect(field(trip, "fields", "memos", "mapValue", "fields", first.place.id, "stringValue")).toBe(
    "아버지 입맛에 맞는 메뉴",
  );
});

test("S2-1 공개 후기: 평균 별점 · 다녀온 가족 수 · 최근 한 줄, 없으면 안내", async ({ page }) => {
  const course = firstCourse();
  // 다른 테스트가 공개 후기를 남기는 곳(첫 장소 · A0018)은 피한다
  const [rv, empty] = course.stops.slice(1).filter((s) => s.place.id !== "A0018");
  if (!rv || !empty) throw new Error("후기를 볼 장소가 모자라요");
  const path = `placeReviews/${rv.place.id}/items/e2e-rv1`;
  await writeDocs([{ path, data: { rating: 4, text: "E2E 후기", at: new Date() } }]);
  try {
    await page.goto(`/result/${course.key}?${resultQuery()}`);
    const block = page.getByRole("article", { name: rv.place.name });
    await expect(block).toContainText(/4\.0\s*· 다녀온 가족 1명/);
    await expect(block.getByText("“E2E 후기”")).toBeVisible();
    await expect(
      page
        .getByRole("article", { name: empty.place.name })
        .getByText("아직 다녀온 가족의 후기가 없어요"),
    ).toBeVisible();
  } finally {
    await deleteDoc(path);
  }
});

test("S2-1: 사진이 여러 장이면 옆으로 밀어 넘겨 본다", async ({ page }) => {
  const place = demoPlaces().find((p) => p.type === "관광지");
  if (!place) throw new Error("관광지가 없어요");
  const id = "e2e-swipe";
  await writeDocs([
    {
      path: `curated/${id}`,
      data: {
        title: "E2E 스와이프",
        summary: "",
        published: true,
        updatedAt: new Date().toISOString(),
        stops: [
          {
            id: "s0",
            placeId: place.id,
            name: place.name,
            lat: place.lat,
            lng: place.lng,
            role: "am",
            stayMin: 40,
            desc: "",
            photos: ["/icons/icon-192.png", "/icons/icon-512.png"],
          },
        ],
      },
    },
  ]);
  try {
    await page.goto(`/result/c-${id}?${resultQuery()}`);
    const block = page.getByRole("article", { name: place.name });
    const first = block.getByRole("img", { name: `${place.name} 1/2` });
    const second = block.getByRole("img", { name: `${place.name} 2/2` });
    const left = async (img: Locator) => (await img.boundingBox())?.x ?? Number.NaN;
    // 아래 고정 띠('이 코스로 확정하기')에 가리지 않게 사진을 화면 가운데로
    await first.evaluate((el) => {
      el.scrollIntoView({ block: "center" });
    });
    const box = await first.boundingBox();
    if (!box) throw new Error("사진 자리를 찾지 못했어요");
    // 둘째 장은 첫 장 오른쪽에 숨어 있다 (가로 위치로 본다 — 세로 스크롤과 무관)
    expect(await left(second)).toBeGreaterThanOrEqual(box.x + box.width);
    await expect(block.getByText("1 / 2")).toBeVisible();

    // 첫 사진을 왼쪽으로 민다
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.85, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.1, y, { steps: 12 });
    await page.mouse.up();

    await expect(block.getByText("2 / 2")).toBeVisible();
    await expect.poll(async () => Math.abs((await left(second)) - box.x)).toBeLessThan(2);

    // 버튼으로도 넘긴다 (키보드 · 화면 읽기 사용자)
    await expect(block.getByRole("button", { name: "다음 사진" })).toBeDisabled();
    await block.getByRole("button", { name: "이전 사진" }).click();
    await expect(block.getByText("1 / 2")).toBeVisible();
  } finally {
    await deleteDoc(`curated/${id}`);
  }
});

test("S2 카드에서 바로 확정해도 자녀 화면으로 간다", async ({ page }) => {
  await page.goto(`/result?${resultQuery()}`);
  await page.getByRole("button", { name: "이 코스로 확정하기" }).first().click();
  await expect(page).toHaveURL(/\/f\/[A-Za-z0-9]{10,}$/);
  const token = new URL(page.url()).pathname.split("/").pop() ?? "";
  expect(field(await getDoc(`links/${token}`), "fields", "role", "stringValue")).toBe("family");
});

test("확정 후 코스 수정: 이름 · 머무는 시간 · 빼기 · 출발 시각 · 넣기가 저장되고 새로고침 뒤에도 보인다", async ({
  page,
}) => {
  const seed = await seedTrip();
  const [a, b] = seed.course.stops;
  if (!a || !b) throw new Error("코스에 장소가 모자라요");
  await page.goto(`/f/${seed.familyToken}/course`);
  await expect(page.getByRole("heading", { name: seed.course.title, level: 2 })).toBeVisible();
  await expect(page.getByText("확정한 코스")).toBeVisible();

  await page.getByRole("button", { name: "코스 수정" }).click();
  await page.getByLabel("코스 이름").fill("엄마랑 바다 산책");
  await page.getByLabel("코스 이름").press("Enter");
  await expect.poll(async () => (await savedCourse(seed.tripId)).title).toBe("엄마랑 바다 산책");

  // 지도의 번호 점을 누르면 그 장소가 골라진다
  const map = page.getByTestId("map-view");
  await map.getByRole("button", { name: a.place.name, exact: true }).click();
  await expect(page.getByRole("radio", { name: `1 ${a.place.name}` })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("button", { name: /머무는 시간 늘리기/ }).click();
  await expect.poll(async () => (await savedCourse(seed.tripId)).stays[0]).toBe(a.stayMin + 10);

  await page.getByRole("radio", { name: `2 ${b.place.name}` }).click();
  await page.getByRole("button", { name: "코스에서 빼기" }).click();
  await expect
    .poll(async () => (await savedCourse(seed.tripId)).names)
    .toEqual(seed.course.stops.filter((s) => s !== b).map((s) => s.place.name));

  await page.getByRole("button", { name: /출발 늦추기/ }).click();
  await expect
    .poll(async () => (await savedCourse(seed.tripId)).startMin)
    .toBe(seed.course.startMin + 10);

  // 지도의 회색 '+' 점(코스에 없는 장소)을 눌러 넣는다
  const cand = map.getByRole("button").filter({ hasText: "+" }).first();
  const fromMap = (await cand.getAttribute("aria-label")) ?? "";
  expect(fromMap).not.toBe("");
  await cand.click();
  await page.getByRole("button", { name: "코스에 넣기" }).click();
  await expect.poll(async () => (await savedCourse(seed.tripId)).names).toContain(fromMap);

  // 같은 목록을 고르는 칸으로도 넣는다
  await page.getByRole("combobox", { name: "다른 장소 넣기" }).click();
  const option = page.getByRole("option").first();
  const added = (await option.textContent()) ?? "";
  expect(added).not.toBe("");
  await option.click();
  await page.getByRole("button", { name: "코스에 넣기" }).click();
  await expect.poll(async () => (await savedCourse(seed.tripId)).names).toContain(added);

  await page.reload();
  await expect(page.getByRole("heading", { name: "엄마랑 바다 산책", level: 2 })).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: a.place.name })
      .getByText(`머무는 시간 ${String(a.stayMin + 10)}분`),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: b.place.name, level: 3 })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: added, level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: fromMap, level: 3 })).toBeVisible();
});

test("확정 후 코스: 어르신용 링크 · 기간이 지난 링크는 안내만 보여 준다", async ({ page }) => {
  const seed = await seedTrip();
  await page.goto(`/f/${seed.seniorToken}/course`);
  await expect(page.getByRole("heading", { name: "링크를 다시 확인해 주세요" })).toBeVisible();

  const old = await seedTrip({ expired: true });
  await page.goto(`/f/${old.familyToken}/course`);
  await expect(page.getByRole("heading", { name: "기간이 지난 여행이에요" })).toBeVisible();
});

test("잘못된 결과 주소는 조건을 다시 고르게 안내한다", async ({ page }) => {
  await page.goto("/result?p=9&a=70");
  await expect(page.getByRole("heading", { name: "여행 조건을 다시 골라 주세요" })).toBeVisible();
  await page.getByRole("link", { name: "조건 고르기" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "코스 3개 만들기" })).toBeVisible();

  await page.goto(`/result/no-such-course?${resultQuery()}`);
  await expect(page.getByRole("heading", { name: "코스를 찾을 수 없어요" })).toBeVisible();
});
