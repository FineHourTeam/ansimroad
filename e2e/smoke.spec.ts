// 스모크 — 모든 라우트가 콘솔 에러 없이 뜨는지 ("렌더는 되는데 아무것도 연결 안 된 UI"를 잡는다).
// ⚠️ 새 라우트를 추가하면 아래 ROUTES 배열에 등록한다 (rules.md § 테스트 — 스모크 스펙 등록).
import { expect, type Locator, test } from "@playwright/test";
import { resultQuery } from "./support/fixtures";

// 토큰 화면은 없는 토큰으로 연다 (안내 화면까지 콘솔 에러 없이). 실제 데이터 흐름은 기능별 스펙이 맡는다.
const NO_TOKEN = "NoSuchToken00";
const ROUTES: { path: string; expectText: RegExp }[] = [
  { path: "/", expectText: /직접 확인한 목포/ },
  { path: `/result?${resultQuery()}`, expectText: /코스/ },
  { path: "/result?p=9", expectText: /여행 조건을 다시 골라 주세요/ },
  { path: `/result/no-such-course?${resultQuery()}`, expectText: /코스를 찾을 수 없어요/ },
  { path: `/f/${NO_TOKEN}`, expectText: /링크를 다시 확인해 주세요/ },
  { path: `/f/${NO_TOKEN}/course`, expectText: /링크/ },
  { path: `/f/${NO_TOKEN}/share`, expectText: /링크를 다시 확인해 주세요/ },
  { path: `/f/${NO_TOKEN}/print`, expectText: /링크를 다시 확인해 주세요/ },
  { path: `/t/${NO_TOKEN}`, expectText: /링크를 다시 확인해 주세요/ },
  { path: `/r/${NO_TOKEN}`, expectText: /리포트를 찾을 수 없어요/ },
  { path: "/admin/login", expectText: /로그인/ },
  { path: "/admin", expectText: /로그인/ }, // 로그인 안 했으면 로그인 화면으로
  { path: "/admin/places", expectText: /로그인/ },
  { path: "/privacy", expectText: /수집하는 항목/ },
  { path: "/location-terms", expectText: /위치/ },
  { path: "/no-such-page", expectText: /페이지를 찾을 수 없어요/ },
];

// 무시할 알려진 소음
const IGNORED_CONSOLE = [/favicon/i, /Download the React DevTools/i, /\[vite\]/i];

for (const route of ROUTES) {
  test(`${route.path} — 콘솔 에러 없이 렌더`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
      errors.push(text);
    });
    page.on("pageerror", (err) => errors.push(err.message));

    const res = await page.goto(route.path);
    expect(res?.ok(), `${route.path} HTTP 응답`).toBeTruthy();
    await expect(page.locator("#root")).not.toBeEmpty();
    await expect(page.getByText(route.expectText).first()).toBeVisible();
    expect(errors, `${route.path} 콘솔/페이지 에러`).toEqual([]);
  });
}

test("결과 주소 쿼리 모양", () => {
  expect(resultQuery()).toMatch(/^p=2&a=70&m=none&w=20&d=\d{4}-\d{2}-\d{2}&t=car$/);
});

// 손가락 탭 크기 · 법적 고지 본문 · 뒤로 가기
const height = async (l: Locator) => (await l.boundingBox())?.height ?? 0;

test("첫 화면 → 개인정보 처리방침 → 뒤로", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "개인정보 처리방침" });
  expect(await height(link)).toBeGreaterThanOrEqual(44);
  await link.click();
  const doc = page.getByTestId("legal-doc");
  await expect(doc.getByRole("heading", { level: 2, name: /수집하는 항목/ })).toBeVisible();
  await expect(doc).not.toContainText("이 파일만 바꾸면");
  const back = page.getByRole("button", { name: "뒤로" });
  expect(await height(back)).toBeGreaterThanOrEqual(44);
  await back.click();
  await expect(page).toHaveURL(/\/$/);
  // 토스트 영역은 한국어 이름으로 읽힌다
  await expect(page.getByRole("region", { name: /^알림/ })).toBeAttached();
});

test("위치정보 이용약관 본문 제목", async ({ page }) => {
  await page.goto("/location-terms");
  await expect(
    page.getByTestId("legal-doc").getByRole("heading", { level: 2 }).first(),
  ).toBeVisible();
  await expect(page.getByTestId("legal-doc")).not.toContainText("이 파일만 바꾸면");
});

test("없는 주소 → 처음으로 (48px 버튼)", async ({ page }) => {
  await page.goto("/no-such-page");
  const home = page.getByRole("link", { name: "처음으로" });
  expect(await height(home)).toBeGreaterThanOrEqual(48);
  await home.click();
  await expect(page).toHaveURL(/\/$/);
});
