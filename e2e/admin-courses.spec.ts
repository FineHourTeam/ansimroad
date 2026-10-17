// 운영진 추천 코스 만들기 (/admin): 로그인 가드 · 지도에서 장소 고르기 · 순서 바꾸기 · 사진 · 공개 · 저장 · 삭제 · 로그아웃
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { parseCsv } from "../src/shared/data/csv";
import { recordsToPlaces, toRecords } from "../src/shared/data/placeRecords";
import { loginAsAdmin } from "./support/admin";
import { ADMIN, getDoc, listDocs, NOT_ADMIN } from "./support/emulator";
import { CURATED_TITLE, PHOTO_FILE } from "./support/fixtures";

const PLACES = recordsToPlaces(
  toRecords(parseCsv(readFileSync("public/data/places.demo.csv", "utf8"))),
).places;
function place(name: string) {
  const p = PLACES.find((x) => x.name === name);
  if (!p) throw new Error(`데모 장소 데이터에 ${name} 없음`);
  return p;
}
const TOUR = place("목포 갓바위");
const LUNCH = place("뜰채");
const CAFE = place("커피창고로");
const SPOT = "E2E 새 위치";

interface FsValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  arrayValue?: { values?: FsValue[] };
  mapValue?: { fields?: Record<string, FsValue> };
}
type Fields = Record<string, FsValue | undefined>;
const items = (v: FsValue | undefined): FsValue[] => v?.arrayValue?.values ?? [];
const fieldsOf = (v: FsValue): Fields => v.mapValue?.fields ?? {};

async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/admin/login");
  await page.getByLabel("이메일").fill(who.email);
  await page.getByLabel("비밀번호").fill(who.password);
  await page.getByRole("button", { name: "로그인하기" }).click();
}

const stopName = (page: Page, n: number) =>
  page.getByLabel(`${String(n)}번 장소 이름`, { exact: true });
const stopCard = (page: Page, n: number) =>
  page.getByRole("listitem", { name: `${String(n)}번 장소`, exact: true });

test("로그인하지 않고 /admin 에 오면 로그인 화면으로 보낸다", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("button", { name: "로그인하기" })).toBeVisible();
});

test("비밀번호가 틀리면 원인을 알려 주고 로그인 화면에 남는다", async ({ page }) => {
  await login(page, { email: ADMIN.email, password: "wrong-password!" });
  await expect(page.getByRole("alert")).toHaveText(/이메일이나 비밀번호가 맞지 않아요/);
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("운영진 명단에 없는 계정은 운영진 전용 안내를 본다", async ({ page }) => {
  await login(page, NOT_ADMIN);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "운영진 계정이 아니에요" })).toBeVisible();
  await expect(page.getByText(NOT_ADMIN.email)).toBeVisible();
});

test("저장 전 확인 · 다른 코스를 열 때 저장 안 한 내용 지키기", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await expect(page.getByText("코스 이름을 적어 주세요")).toBeVisible();

  await page.getByLabel("코스 이름").fill("버릴 코스");
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await expect(page.getByText("지도에서 장소를 하나 이상 골라 주세요")).toBeVisible();

  await page.getByRole("button", { name: new RegExp(CURATED_TITLE) }).click();
  const guard = page.getByRole("alertdialog");
  await expect(guard).toContainText("저장하지 않은 내용이 있어요");
  await guard.getByRole("button", { name: "닫기" }).click();
  await expect(page.getByLabel("코스 이름")).toHaveValue("버릴 코스");

  await page.getByRole("button", { name: new RegExp(CURATED_TITLE) }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "버리고 열기" }).click();
  await expect(page.getByLabel("코스 이름")).toHaveValue(CURATED_TITLE);
  await expect(page.getByRole("list", { name: "코스 순서" }).getByRole("listitem")).toHaveCount(4);

  // 다른 운영진 탭으로 갈 때도 지킨다
  await page.getByLabel("코스 이름").fill("버릴 이름");
  await page.getByRole("link", { name: "장소 데이터" }).click();
  const leave = page.getByRole("alertdialog");
  await expect(leave).toContainText("지금 고친 내용을 버리고 나갈까요?");
  await leave.getByRole("button", { name: "닫기" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByLabel("코스 이름")).toHaveValue("버릴 이름");
  await page.getByRole("link", { name: "장소 데이터" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "버리고 나가기" }).click();
  await expect(page).toHaveURL(/\/admin\/places$/);

  // 로그아웃도 먼저 묻는다 — [닫기]면 그대로, 버리면 한 번만 묻고 로그인 화면으로
  await page.getByRole("link", { name: "추천 코스 만들기" }).click();
  await page.getByLabel("코스 이름").fill("버릴 이름");
  await page.getByRole("button", { name: "로그아웃" }).click();
  const out = page.getByRole("alertdialog");
  await expect(out).toContainText("저장하지 않은 내용이 있어요");
  await out.getByRole("button", { name: "닫기" }).click();
  await expect(out).toBeHidden();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByLabel("코스 이름")).toHaveValue("버릴 이름");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await out.getByRole("button", { name: "버리고 로그아웃하기" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(out).toHaveCount(0);
});

test("사진을 올리는 동안 다른 코스로 가면 막고, 늦게 끝난 사진은 새 코스를 건드리지 않는다", async ({
  page,
}) => {
  await loginAsAdmin(page);
  const curated = page.getByRole("button", { name: new RegExp(CURATED_TITLE) });
  await curated.click();
  await expect(page.getByLabel("코스 이름")).toHaveValue(CURATED_TITLE);

  // 사진 올리기 요청을 붙잡아 '올리는 중'을 만든다 (저장하지 않으므로 공용 코스는 그대로)
  let release: () => void = () => undefined;
  const gate = new Promise<void>((r) => {
    release = () => {
      r();
    };
  });
  await page.route("**/v0/b/**", async (route) => {
    if (route.request().method() === "POST") await gate;
    await route.continue();
  });
  const first = stopCard(page, 1);
  await first.getByRole("button", { name: /사진 · 설명/ }).click();
  await first.locator('input[type="file"]').setInputFiles(PHOTO_FILE);
  await expect(first.getByRole("button", { name: "올리는 중이에요" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "삭제하기" })).toBeDisabled();
  await expect(page.getByText("저장하지 않은 내용이 있어요")).toHaveCount(0);

  await page.getByRole("button", { name: "새 코스 만들기" }).click();
  const guard = page.getByRole("alertdialog");
  await expect(guard).toContainText("올리는 중인 사진은 코스에 들어가지 않아요");
  await guard.getByRole("button", { name: "버리고 열기" }).click();
  await expect(page.getByLabel("코스 이름")).toHaveValue("");

  // 사진이 늦게 끝나도 새 코스는 '저장 안 함'이 되지 않아 바로 다른 코스를 연다
  const uploaded = page.waitForResponse(
    (r) => r.request().method() === "GET" && r.url().includes("/o/curated%2F"),
  );
  release();
  await uploaded;
  await expect(guard).toHaveCount(0);
  await expect(page.getByText("저장하지 않은 내용이 있어요")).toHaveCount(0);
  await curated.click();
  await expect(page.getByLabel("코스 이름")).toHaveValue(CURATED_TITLE);
  await expect(guard).toHaveCount(0);
});

test("지도에서 장소를 골라 코스를 만들고, 저장 → 새로고침 → 삭제 → 로그아웃", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByText(CURATED_TITLE)).toBeVisible();

  const title = `E2E 코스 ${Date.now().toString(36)}`;
  await page.getByRole("button", { name: "새 코스 만들기" }).click();
  await page.getByLabel("코스 이름").fill(title);
  await page.getByLabel("한 줄 소개").fill("계단 없이 천천히 걷는 코스");

  // 회색 + 점(등록된 장소) 3곳 → 지도 빈 곳에 새 위치 1곳
  const map = page.getByTestId("map-view");
  for (const p of [TOUR, LUNCH, CAFE])
    await map.getByRole("button", { name: `${p.name} (눌러서 추가)`, exact: true }).click();
  await page.getByTestId("sketch-map-canvas").click({ position: { x: 12, y: 12 } });
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("장소 이름").fill(SPOT);
  await dialog.getByRole("button", { name: "추가하기" }).click();
  await expect(dialog).toBeHidden();
  for (const [i, name] of [TOUR.name, LUNCH.name, CAFE.name, SPOT].entries()) {
    await expect(stopName(page, i + 1)).toHaveValue(name);
  }
  await expect(page.getByRole("region", { name: "예상 시간표" })).toContainText(
    "예상 시간표 10:00",
  );
  // 코스가 길어도 저장 줄은 화면 아래에 붙어 있다 · '접근성 정보 없음'은 새 위치 칸에만
  await expect(page.getByRole("button", { name: "저장하기", exact: true })).toBeInViewport();
  await expect(page.getByText("접근성 정보 없음")).toHaveCount(1);

  // 버튼으로 1 → 2, 키보드 끌어서 놓기로 4 → 3
  await stopCard(page, 1).getByRole("button", { name: "아래로 옮기기" }).click();
  const handle = stopCard(page, 4).getByRole("button", { name: "끌어서 순서 바꾸기" });
  // 스크린리더 안내(라이브 영역)가 바뀌는 걸 기다리며 한 단계씩 누른다
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(page.getByText("4번 장소 자리예요")).toBeAttached();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByText("3번 장소 자리예요")).toBeAttached();
  await page.keyboard.press("Space");
  await expect(page.getByText("3번 장소 자리로 옮겼어요")).toBeAttached();
  const order = [LUNCH.name, TOUR.name, SPOT, CAFE.name];
  for (const [i, name] of order.entries()) await expect(stopName(page, i + 1)).toHaveValue(name);

  // 2번(갓바위): 구분 오후 · 머무는 시간 +20분
  await page.getByLabel("2번 장소 구분", { exact: true }).click();
  await page.getByRole("option", { name: "오후" }).click();
  const stay = (TOUR.stayMin ?? 40) + 20;
  await stopCard(page, 2).getByRole("button", { name: "10분 늘리기" }).click();
  await stopCard(page, 2).getByRole("button", { name: "10분 늘리기" }).click();
  await expect(stopCard(page, 2)).toContainText(`${String(stay)}분`);

  // 1번(뜰채): 설명 + 사진 파일 올리기
  const first = stopCard(page, 1);
  await first.getByRole("button", { name: /사진 · 설명/ }).click();
  await first.getByLabel("설명").fill("입구에 경사로가 있어요");
  await first.locator('input[type="file"]').setInputFiles(PHOTO_FILE);
  await expect(first.getByRole("img", { name: `${LUNCH.name} 사진 1` })).toBeVisible();

  await page.getByRole("switch", { name: "사용자 화면에 공개" }).click();
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await expect(page.getByText("저장했어요 · 사용자 화면에 공개 중")).toBeVisible();

  // Firestore 에 그대로 남았는지
  let doc: { name: string; fields: Fields } | undefined;
  await expect
    .poll(async () => {
      doc = (await listDocs("curated")).find(
        (d) => (d.fields as Fields).title?.stringValue === title,
      ) as { name: string; fields: Fields } | undefined;
      return doc !== undefined;
    })
    .toBe(true);
  if (!doc) throw new Error("저장한 코스 문서 없음");
  const id = doc.name.split("/").pop() ?? "";
  expect(doc.fields.published?.booleanValue).toBe(true);
  expect(doc.fields.summary?.stringValue).toBe("계단 없이 천천히 걷는 코스");
  const stops = items(doc.fields.stops).map(fieldsOf);
  expect(stops.map((s) => s.name?.stringValue)).toEqual(order);
  expect(stops[0]?.placeId?.stringValue).toBe(LUNCH.id);
  expect(stops[0]?.desc?.stringValue).toBe("입구에 경사로가 있어요");
  expect(items(stops[0]?.photos)[0]?.stringValue).toMatch(/curated%2F/);
  expect(stops[1]?.role?.stringValue).toBe("pm");
  expect(stops[1]?.stayMin?.integerValue).toBe(String(stay));
  expect(stops[2]?.placeId).toBeUndefined();
  expect(stops[3]?.role?.stringValue).toBe("cafe");

  const preview = page.getByRole("link", { name: "사용자 화면에서 보기" });
  await expect(preview).toHaveAttribute("href", new RegExp(`/result/c-${id}\\?`));
  // 미리보기 날짜는 코스 장소(뜰채는 월요일 휴무)가 모두 여는 날 — 그 조건으로 S2 를 연다 (요일마다 결과가 달라지지 않게)
  const query = (await preview.getAttribute("href"))?.split("?")[1] ?? "";

  // 사용자 화면(S2 → S2-1)에 공개되어 올린 사진 · 설명 · 새 위치까지 보이고, 확정도 된다
  const user = await page.context().newPage();
  await user.goto(`/result?${query}`);
  const card = user
    .getByRole("region", { name: "모담팀 추천 코스" })
    .getByRole("article", { name: title });
  await card.getByRole("link", { name: "자세히 보기" }).click();
  await expect(user).toHaveURL(new RegExp(`/result/c-${id}\\?`));
  await expect(user.getByRole("heading", { name: title, level: 2 })).toBeVisible();
  const lunch = user.getByRole("article", { name: LUNCH.name });
  await expect(lunch.getByRole("img", { name: LUNCH.name })).toHaveAttribute("src", /curated%2F/);
  await expect(lunch.getByText("입구에 경사로가 있어요")).toBeVisible();
  await expect(user.getByRole("article", { name: SPOT })).toBeVisible();
  await user.getByRole("button", { name: "이 코스로 확정하기" }).click();
  await expect(user).toHaveURL(/\/f\/[A-Za-z0-9]{10,}$/);
  await user.close();

  // 새로고침해도 목록에 있고, 열면 순서 · 사진이 그대로
  await page.reload();
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await expect(page.getByLabel("코스 이름")).toHaveValue(title);
  for (const [i, name] of order.entries()) await expect(stopName(page, i + 1)).toHaveValue(name);
  await expect(page.getByRole("switch", { name: "사용자 화면에 공개" })).toBeChecked();

  // 삭제 → Firestore 에서도 사라진다
  await page.getByRole("button", { name: "삭제하기" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText(title);
  await confirm.getByRole("button", { name: "삭제하기" }).click();
  await expect(page.getByText("코스를 삭제했어요")).toBeVisible();
  await expect.poll(() => getDoc(`curated/${id}`)).toBeNull();
  await expect(page.getByRole("button", { name: new RegExp(title) })).toHaveCount(0);
  await expect(page.getByLabel("코스 이름")).toHaveValue("");

  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("button", { name: "로그인하기" })).toBeVisible();
});

test("장소는 10곳까지만 넣는다 (확정 때 보안 규칙이 막는 수)", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("button", { name: "새 코스 만들기" }).click();
  const cand = page.getByTestId("map-view").getByRole("button", { name: /\(눌러서 추가\)$/ });
  const list = page.getByRole("listitem", { name: /^\d+번 장소$/ });
  for (let n = 1; n <= 10; n++) {
    await cand.first().click();
    await expect(list).toHaveCount(n);
  }
  await page.getByTestId("sketch-map-canvas").click({ position: { x: 12, y: 12 } });
  await expect(page.getByText("장소는 10곳까지 넣을 수 있어요", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(list).toHaveCount(10);
});
