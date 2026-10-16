// 운영진 장소 데이터 (/admin/places): 목록 · 검색 · 보기 · 빠진 장소 · 새 장소(버튼 · 지도) · 고치기 · 검사 · ID 중복 ·
// 저장 안 한 채 닫기 확인 · 지도 점으로 다른 장소 열기 · 삭제 · 사진 · CSV 내보내기/가져오기 · 관광공사 가져오기 · 빈 칸 채우기.
// 이 테스트가 만드는 장소는 모두 E2E- ID 이고, 끝나면 지운다 (시드 장소는 건드리지 않는다).
// 매일 휴무로 넣어 다른 테스트의 코스 생성에 섞이지 않게 하고, 좌표는 시드 장소들 안쪽에 둬 약도 배치를 크게 바꾸지 않는다.
import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  emptyRecord,
  recordsToCsv,
  validateRecord,
  type PlaceRecord,
} from "../src/shared/data/placeRecords";
import { loginAsAdmin } from "./support/admin";
import { getDoc, PROJECT, writeDocs } from "./support/emulator";
import { PHOTO_FILE } from "./support/fixtures";

const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const CLOSED = "일·월·화·수·목·금·토";

const created = new Set<string>();
function newId(tag: string): string {
  const id = `E2E-${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  created.add(id);
  return id;
}
test.afterEach(async () => {
  for (const id of created) {
    if (!id.startsWith("E2E-")) continue; // 시드 장소는 절대 지우지 않는다
    await fetch(`${FS}/places/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer owner" },
    });
  }
  created.clear();
});

const coord = () => ({
  위도: (34.785 + Math.random() * 0.01).toFixed(6),
  경도: (126.39 + Math.random() * 0.03).toFixed(6),
});

function record(id: string, over: Partial<PlaceRecord> = {}): PlaceRecord {
  return {
    ...emptyRecord(),
    ID: id,
    장소명: `${id} 장소`,
    유형: "관광지",
    지역: "목포",
    권역: "E2E권",
    휴무요일: CLOSED,
    확인상태: "미확인",
    ...coord(),
    ...over,
  };
}

async function field(id: string, col: string): Promise<string | undefined> {
  const doc = await getDoc(`places/${encodeURIComponent(id)}`);
  const fields = doc?.fields as Record<string, { stringValue?: string } | undefined> | undefined;
  return fields?.[col]?.stringValue;
}
const exists = async (id: string) => (await getDoc(`places/${encodeURIComponent(id)}`)) !== null;

const table = (page: Page) => page.getByRole("table", { name: "장소 목록" });
const sheet = (page: Page) => page.getByRole("dialog");

async function search(page: Page, q: string) {
  await page.getByRole("searchbox", { name: "검색" }).fill(q);
}

async function choose(scope: Locator, label: string, option: string, exact = false) {
  await scope.getByLabel(label, { exact }).click();
  await scope.page().getByRole("option", { name: option, exact: true }).click();
}

async function openPlace(page: Page, id: string, name: string) {
  await search(page, id);
  await table(page).getByRole("button", { name }).click();
  await expect(sheet(page).getByText(`ID ${id}`)).toBeVisible();
}

// '새 장소 만들기'는 지도 / 관광공사 중 고르는 창을 연다. 고르면 창이 닫히고 편집 시트가 열린다
const picker = (page: Page) => page.getByRole("dialog", { name: "새 장소 만들기" });

/** 고르는 창의 지도 빈 곳을 눌러 그 좌표로 새 장소 편집을 연다 */
async function newFromMap(page: Page) {
  await page.getByRole("button", { name: "새 장소 만들기" }).click();
  await picker(page)
    .getByTestId("sketch-map-canvas")
    .click({ position: { x: 12, y: 12 } });
  await expect(picker(page)).toHaveCount(0);
}

/** 고르는 창의 관광공사 탭에서 '바위'를 찾는다 */
async function searchTour(page: Page) {
  await page.getByRole("button", { name: "새 장소 만들기" }).click();
  await picker(page).getByRole("tab", { name: "한국관광공사에서 가져오기" }).click();
  await picker(page).getByLabel("관광공사 검색어").fill("바위");
  await picker(page).getByRole("button", { name: "검색하기" }).click();
}

type TourMock = { cid: string; title: string; addr1: string; 위도: string; 경도: string };
function tourMock(): TourMock {
  const cid = `${String(Date.now()).slice(-7)}${String(Math.floor(Math.random() * 100))}`;
  return {
    cid,
    title: `E2E 관광공사 바위 ${cid}`,
    addr1: `전라남도 목포시 E2E로 ${cid}`,
    ...coord(),
  };
}

/** /api/tourapi/** 를 tourapi.ts 가 읽는 모양으로 흉내 낸다 (검색 2곳 중 목포 1곳 · 소개 · 이용시간) */
async function mockTour(page: Page, t: TourMock) {
  const ok = (item: unknown) => ({
    response: { header: { resultCode: "0000" }, body: { items: item ? { item } : "" } },
  });
  await page.route("**/api/tourapi/**", async (route) => {
    const url = route.request().url();
    const body = url.includes("searchKeyword2")
      ? ok([
          {
            contentid: t.cid,
            contenttypeid: "12",
            title: t.title,
            addr1: t.addr1,
            mapx: t.경도,
            mapy: t.위도,
          },
          {
            contentid: "1",
            contenttypeid: "12",
            title: "다른 지역 바위",
            addr1: "경상북도 경산시",
          },
        ])
      : url.includes("detailIntro2")
        ? ok([{ usetime: "상시" }])
        : url.includes("detailCommon2")
          ? ok([{ overview: "E2E<br>소개" }])
          : ok(null);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
}

test("목록에 시드 장소가 보이고, 장소명 · ID 로 걸러진다", async ({ page }) => {
  await loginAsAdmin(page, "/admin/places");
  await expect(table(page).getByRole("button", { name: "목포 해상케이블카" })).toBeVisible();
  await expect(table(page).getByRole("button", { name: "목포평화광장" })).toBeVisible();

  await search(page, "평화광장");
  await expect(table(page).getByRole("button", { name: "목포평화광장" })).toBeVisible();
  await expect(table(page).getByRole("button", { name: "목포 해상케이블카" })).toHaveCount(0);

  await search(page, "A0018");
  await expect(table(page).getByRole("button", { name: "목포 해상케이블카" })).toBeVisible();
  await expect(table(page).getByRole("button", { name: "목포평화광장" })).toHaveCount(0);

  await search(page, "없는장소이름");
  await expect(page.getByText("찾는 장소가 없어요")).toBeVisible();
});

test("새 장소를 만들면 Firestore 에 저장되고 표에 나온다", async ({ page }) => {
  const id = newId("new");
  const name = `${id} 새 장소`;
  const { 위도, 경도 } = coord();
  await loginAsAdmin(page, "/admin/places");
  await newFromMap(page);
  const s = sheet(page);
  await expect(s.getByRole("heading", { name: "새 장소" })).toBeVisible();

  await s.getByLabel("ID").fill(id);
  await s.getByLabel("장소명").fill(name);
  await choose(s, "유형", "카페휴식");
  await s.getByLabel("권역").fill("E2E권");
  await s.getByLabel("위도").fill(위도);
  await s.getByLabel("경도").fill(경도);
  await s.getByLabel("휴무요일").fill(CLOSED);
  await choose(s, "화장실", "있음", true); // '장애인화장실'과 구분
  await s.getByRole("button", { name: "저장하기" }).click();

  await expect.poll(() => field(id, "장소명")).toBe(name);
  expect(await field(id, "유형")).toBe("카페휴식");
  expect(await field(id, "화장실")).toBe("있음");
  expect(await field(id, "지역")).toBe("목포"); // 새 장소 기본값
  expect(await field(id, "위도")).toBe(위도);
  await expect(s.getByRole("heading", { name })).toBeVisible();
  await expect(s.getByRole("button", { name: "삭제하기" })).toBeVisible();

  await page.keyboard.press("Escape");
  await search(page, id);
  await expect(table(page).getByRole("button", { name })).toBeVisible();
});

test("고친 칸이 저장되고 새로 불러와도 남아 있다", async ({ page }) => {
  const id = newId("edit");
  const rec = record(id);
  await writeDocs([{ path: `places/${id}`, data: { ...rec } }]);
  await loginAsAdmin(page, "/admin/places");
  await openPlace(page, id, rec.장소명);

  // 위도 칸에 커서를 둔 채 휠을 굴려도 값이 바뀌지 않는다 (시트만 내려간다)
  const lat = sheet(page).getByLabel("위도");
  await lat.click();
  await lat.hover();
  await page.mouse.wheel(0, -100);
  await expect(lat).toHaveValue(rec.위도);

  const renamed = `${id} 고친 이름`;
  await sheet(page).getByLabel("장소명").fill(renamed);
  await sheet(page).getByLabel("운영시간").fill("10:00-17:00");
  await choose(sheet(page), "확인상태", "전화");
  await sheet(page).getByRole("button", { name: "저장하기" }).click();

  await expect.poll(() => field(id, "장소명")).toBe(renamed);
  expect(await field(id, "운영시간")).toBe("10:00-17:00");
  expect(await field(id, "확인상태")).toBe("전화");
  expect(await field(id, "위도")).toBe(rec.위도);

  await page.reload();
  await search(page, id);
  await expect(table(page).getByRole("button", { name: renamed })).toBeVisible();
  await expect(table(page).getByText("전화로 확인")).toBeVisible();
});

test("위도가 국내 범위를 벗어나면 이유를 보여 주고 저장하지 않는다", async ({ page }) => {
  const id = newId("bad");
  await loginAsAdmin(page, "/admin/places");
  await newFromMap(page);
  const s = sheet(page);
  await s.getByLabel("ID").fill(id);
  await s.getByLabel("장소명").fill(`${id} 잘못된 좌표`);
  await choose(s, "유형", "관광지");
  await s.getByLabel("권역").fill("E2E권");
  await s.getByLabel("위도").fill("999");
  await s.getByLabel("경도").fill("126.4");
  await s.getByRole("button", { name: "저장하기" }).click();

  await expect(s.getByRole("alert")).toHaveText(/위도·경도가 국내 범위를 벗어났어요/);
  await expect(s.getByRole("heading", { name: "새 장소" })).toBeVisible();
  expect(await exists(id)).toBe(false);

  // 고치면 저장된다
  await s.getByLabel("위도").fill(coord().위도);
  await s.getByLabel("휴무요일").fill(CLOSED);
  await s.getByRole("button", { name: "저장하기" }).click();
  await expect.poll(() => exists(id)).toBe(true);
  await expect(s.getByRole("alert")).toHaveCount(0);
});

test("이미 있는 ID 로는 새 장소를 만들지 않는다", async ({ page }) => {
  await loginAsAdmin(page, "/admin/places");
  await newFromMap(page);
  const s = sheet(page);
  await s.getByLabel("ID").fill("A0018"); // 시드 장소 ID
  await s.getByLabel("장소명").fill("E2E 덮어쓰면 안 되는 이름");
  await choose(s, "유형", "관광지");
  await s.getByLabel("권역").fill("E2E권");
  await s.getByLabel("위도").fill(coord().위도);
  await s.getByLabel("경도").fill(coord().경도);
  await s.getByRole("button", { name: "저장하기" }).click();

  await expect(s.getByRole("alert")).toHaveText(/같은 ID가 이미 있어요/);
  await expect(s.getByRole("heading", { name: "새 장소" })).toBeVisible();
  expect(await field("A0018", "장소명")).toBe("목포 해상케이블카");

  await s.getByLabel("ID").fill("E2E bad/id"); // '/' · 공백도 막는다
  await s.getByRole("button", { name: "저장하기" }).click();
  await expect(s.getByRole("alert")).toHaveText(/ID에 '\/'나 공백은 쓸 수 없어요/);
});

test("지도 빈 곳을 누르면 그 좌표로 새 장소를 만든다", async ({ page }) => {
  const id = newId("map");
  await loginAsAdmin(page, "/admin/places");
  await newFromMap(page);
  const s = sheet(page);
  await expect(s.getByRole("heading", { name: "새 장소" })).toBeVisible();
  const lat = await s.getByLabel("위도").inputValue();
  const lng = await s.getByLabel("경도").inputValue();
  expect(lat).toMatch(/^\d+\.\d{6}$/);
  expect(lng).toMatch(/^\d+\.\d{6}$/);

  await s.getByLabel("ID").fill(id);
  await s.getByLabel("장소명").fill(`${id} 지도로 만든 곳`);
  await choose(s, "유형", "관광지");
  await s.getByLabel("권역").fill("E2E권");
  await s.getByLabel("휴무요일").fill(CLOSED);
  await s.getByRole("button", { name: "저장하기" }).click();
  await expect.poll(() => field(id, "위도")).toBe(lat);
  expect(await field(id, "경도")).toBe(lng);
});

test("코스에서 빠진 장소는 이유와 함께 모이고, 보기로 걸러지고, 고치면 빠진다", async ({
  page,
}) => {
  const id = newId("skip");
  const rec = record(id, { 위도: "", 경도: "" });
  const reason = validateRecord(rec);
  expect(reason).not.toBeNull();
  await writeDocs([{ path: `places/${id}`, data: { ...rec } }]);
  await loginAsAdmin(page, "/admin/places");

  const report = page.getByRole("button", { name: `${rec.장소명} · ${id}` });
  await expect(report).toBeVisible();
  await expect(page.getByText(reason ?? "", { exact: true }).first()).toBeVisible();

  const body = page.locator("body");
  await choose(body, "보기", "코스에서 빠진 곳");
  await search(page, id);
  await expect(table(page).getByRole("button", { name: rec.장소명 })).toBeVisible();
  const row = table(page).getByRole("row").filter({ hasText: rec.장소명 });
  await expect(row.getByText("빠짐", { exact: true })).toBeVisible();
  await expect(row.getByText(reason ?? "", { exact: true })).toBeVisible();
  await search(page, "A0018"); // 시드 장소는 코스에 들어가 있다
  await expect(page.getByText("찾는 장소가 없어요")).toBeVisible();
  await choose(body, "보기", "확인 안 된 곳");
  await search(page, id);
  await expect(table(page).getByRole("button", { name: rec.장소명 })).toBeVisible();

  await report.click();
  const s = sheet(page);
  await expect(s.getByText(`ID ${id}`)).toBeVisible();
  const { 위도, 경도 } = coord();
  await s.getByLabel("위도").fill(위도);
  await s.getByLabel("경도").fill(경도);
  await s.getByRole("button", { name: "저장하기" }).click();
  await expect.poll(() => field(id, "위도")).toBe(위도);
  await expect(s.getByRole("button", { name: "저장하기" })).toBeEnabled(); // 저장이 끝나야 닫힌다
  await page.keyboard.press("Escape");
  await expect(report).toHaveCount(0);
});

test("고친 칸이 있으면 닫거나 다른 장소로 넘어가기 전에 묻는다", async ({ page }) => {
  const a = record(newId("dirtyA"));
  const b = record(newId("dirtyB"));
  await writeDocs([
    { path: `places/${a.ID}`, data: { ...a } },
    { path: `places/${b.ID}`, data: { ...b } },
  ]);
  await loginAsAdmin(page, "/admin/places");
  await openPlace(page, a.ID, a.장소명);
  const s = sheet(page);
  await s.getByLabel("장소명").fill(`${a.ID} 저장 안 할 이름`);

  await page.keyboard.press("Escape");
  const ask = page.getByRole("alertdialog");
  await expect(ask).toContainText("고친 내용을 저장하지 않고 닫을까요?");
  await ask.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(s.getByLabel("장소명")).toHaveValue(`${a.ID} 저장 안 할 이름`);

  // 지도의 회색 점으로 다른 장소 열기 (고친 칸이 있어 먼저 묻는다)
  await s.getByRole("button", { name: b.장소명 }).click();
  await ask.getByRole("button", { name: "저장하지 않고 닫기" }).click();
  await expect(s.getByText(`ID ${b.ID}`)).toBeVisible();
  expect(await field(a.ID, "장소명")).toBe(a.장소명);

  // 고친 칸이 없으면 바로 닫힌다
  await page.keyboard.press("Escape");
  await expect(sheet(page)).toHaveCount(0);
  await expect(ask).toHaveCount(0);
});

test("삭제하면 확인 후 Firestore 와 표에서 사라진다", async ({ page }) => {
  const id = newId("del");
  const rec = record(id);
  await writeDocs([{ path: `places/${id}`, data: { ...rec } }]);
  await loginAsAdmin(page, "/admin/places");
  await openPlace(page, id, rec.장소명);

  await sheet(page).getByRole("button", { name: "삭제하기" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("이 장소를 삭제할까요?");
  await confirm.getByRole("button", { name: "닫기" }).click();
  expect(await exists(id)).toBe(true);

  await sheet(page).getByRole("button", { name: "삭제하기" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "삭제하기" }).click();
  await expect.poll(() => exists(id)).toBe(false);
  await expect(sheet(page)).toHaveCount(0);
  await expect(table(page).getByRole("button", { name: rec.장소명 })).toHaveCount(0);
});

test("사진을 올리면 사진URL 칸에 붙고 저장된다", async ({ page }) => {
  const id = newId("photo");
  const rec = record(id);
  await writeDocs([{ path: `places/${id}`, data: { ...rec } }]);
  await loginAsAdmin(page, "/admin/places");
  await openPlace(page, id, rec.장소명);

  await sheet(page).getByLabel("장소 사진 파일 고르기").setInputFiles(PHOTO_FILE);
  await expect(sheet(page).getByRole("img", { name: "사진 1" })).toBeVisible();
  await sheet(page).getByRole("button", { name: "저장하기" }).click();
  await expect.poll(() => field(id, "사진URL")).toContain(`places%2F${id}%2F`);

  await sheet(page).getByRole("button", { name: "사진 1 빼기" }).click();
  await expect(sheet(page).getByRole("img", { name: "사진 1" })).toHaveCount(0);
  await sheet(page).getByRole("button", { name: "저장하기" }).click();
  await expect.poll(() => field(id, "사진URL")).toBe("");
});

test("CSV 내보내기는 BOM 과 조사표 머리줄로 시작한다", async ({ page }) => {
  await loginAsAdmin(page, "/admin/places");
  await expect(table(page)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "CSV 내보내기" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("places.csv");
  const bytes = readFileSync(await download.path());
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const text = bytes.subarray(3).toString("utf8");
  expect(text.startsWith("ID,장소명,")).toBe(true);
  expect(text).toContain("A0018,목포 해상케이블카");
});

test("CSV 가져오기는 미리 보기 뒤 장소를 넣는다", async ({ page }) => {
  const a = record(newId("csv"));
  const b = record(newId("csv"), { 장소명: "E2E, 쉼표 있는 이름" });
  await loginAsAdmin(page, "/admin/places");
  await expect(table(page)).toBeVisible();
  await page.getByLabel("CSV 파일 고르기").setInputFiles({
    name: "e2e-places.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(recordsToCsv([a, b]), "utf8"),
  });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("넣을 장소 2곳");
  await dialog.getByRole("button", { name: "2곳 가져오기" }).click();

  await expect.poll(() => field(a.ID, "장소명")).toBe(a.장소명);
  expect(await field(b.ID, "장소명")).toBe("E2E, 쉼표 있는 이름");
  await expect(dialog).toHaveCount(0);
  await search(page, b.ID);
  await expect(table(page).getByRole("button", { name: b.장소명 })).toBeVisible();
});

test("관광공사에서 찾아 새 장소로 가져오면 저장된다", async ({ page }) => {
  const id = newId("tour");
  const t = tourMock();
  await mockTour(page, t);

  await loginAsAdmin(page, "/admin/places");
  await searchTour(page);
  const results = picker(page).getByRole("list", { name: "관광공사 검색 결과" });
  await expect(results.getByText(t.title)).toBeVisible();
  await expect(results.getByText("다른 지역 바위")).toHaveCount(0); // 목포만
  await results.getByRole("button", { name: `${t.title} 새 장소로 가져오기` }).click();
  await expect(picker(page)).toHaveCount(0);

  const s = sheet(page);
  await expect(s.getByLabel("장소명")).toHaveValue(t.title);
  await expect(s.getByLabel("위도")).toHaveValue(t.위도);
  await s.getByLabel("ID").fill(id);
  await s.getByLabel("권역").fill("E2E권");
  await s.getByLabel("휴무요일").fill(CLOSED);
  await s.getByRole("button", { name: "저장하기" }).click();

  await expect.poll(() => field(id, "장소명")).toBe(t.title);
  expect(await field(id, "비고")).toContain(`TourAPI contentid=${t.cid}`);
  expect(await field(id, "비고")).toContain("[관광공사 이용시간] 상시");
  expect(await field(id, "경도")).toBe(t.경도);
  await expect(s.getByRole("heading", { name: t.title })).toBeVisible(); // 저장이 끝나야 닫힌다

  // 이미 가져온 장소는 다시 고를 수 없다 (창을 다시 열어 같은 검색어로 찾는다)
  await page.keyboard.press("Escape");
  await searchTour(page);
  await expect(results.getByText("이미 있음")).toBeVisible();
});

test("편집 중에 관광공사 정보로 빈 칸만 채운다", async ({ page }) => {
  const id = newId("fill");
  const rec = record(id);
  const t = tourMock();
  await writeDocs([{ path: `places/${id}`, data: { ...rec } }]);
  await mockTour(page, t);
  await loginAsAdmin(page, "/admin/places");
  await openPlace(page, id, rec.장소명);

  const s = sheet(page);
  await s.getByText("관광공사 정보로 빈 칸 채우기").click();
  await s.getByLabel("관광공사 검색어").fill("바위");
  await s.getByRole("button", { name: "검색하기" }).click();
  await s.getByRole("button", { name: `${t.title} 빈 칸 채우기` }).click();
  await expect(s.getByLabel("주소")).toHaveValue(t.addr1); // 빈 칸은 채우고
  await expect(s.getByLabel("장소명")).toHaveValue(rec.장소명); // 채운 칸은 그대로
  await s.getByRole("button", { name: "저장하기" }).click();

  await expect.poll(() => field(id, "주소")).toBe(t.addr1);
  expect(await field(id, "장소명")).toBe(rec.장소명);
  expect(await field(id, "위도")).toBe(rec.위도);
  expect(await field(id, "비고")).toContain(`TourAPI contentid=${t.cid}`);
});
