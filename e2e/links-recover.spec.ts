// 모담 10/29 메일: 자녀용 링크 다시 찾기(최근 만든 여행 · 자녀 링크 [공유]로 나에게 보내 두기) · PC 공유 · 장소 카드 버튼 넘침
import { devices, expect, test, type Page } from "@playwright/test";
import { firstCourse, resultQuery, seedTrip } from "./support/fixtures";

/** 공유 창 대신 넘긴 글을 window.__shared 에 모은다 */
async function recordShares(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __shared: { text?: string }[] };
    w.__shared = [];
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (d: { text?: string }) => {
        w.__shared.push({ text: d.text });
        return Promise.resolve();
      },
    });
  });
}
const lastShare = (page: Page) =>
  page.evaluate(() => {
    const list = (window as unknown as { __shared: { text?: string }[] }).__shared;
    return list[list.length - 1]?.text ?? "";
  });

test("확정하면 첫 화면 '최근 만든 여행'에서 자녀 화면을 다시 연다 (토큰 · 날짜 · 테마만 저장)", async ({
  page,
}) => {
  const course = firstCourse();
  await page.goto(`/result/${course.key}?${resultQuery()}`);
  await page.getByRole("button", { name: "이 코스로 확정하기" }).click();
  await expect(page).toHaveURL(/\/f\/[A-Za-z0-9]{10,}$/);
  const token = new URL(page.url()).pathname.split("/").pop() ?? "";

  const saved = await page.evaluate(() => localStorage.getItem("sr.recentTrips"));
  const list = JSON.parse(saved ?? "[]") as Record<string, string>[];
  expect(list).toHaveLength(1);
  expect(Object.keys(list[0] ?? {}).sort()).toEqual(["date", "theme", "token"]);
  expect(list[0]?.token).toBe(token);

  await page.goto("/");
  const recent = page.getByRole("region", { name: "최근 만든 여행" });
  await expect(recent).toBeVisible();
  await recent.getByRole("link", { name: new RegExp(course.title) }).click();
  await expect(page).toHaveURL(new RegExp(`/f/${token}$`));
});

test("부모님 링크 · 자녀 링크로 연 화면은 '최근 만든 여행'에 남기지 않는다", async ({ page }) => {
  const trip = await seedTrip();
  await page.goto(`/t/${trip.seniorToken}`);
  await page.getByRole("button", { name: "동의하고 시작" }).click();
  await expect(page.getByRole("list", { name: "오늘 일정" })).toBeVisible();
  await page.goto(`/f/${trip.familyToken}`);
  await expect(page.getByRole("heading", { name: "부모님 링크" })).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "여행하실 분의 조건을 골라 주세요" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "최근 만든 여행" })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("sr.recentTrips"))).toBeNull();
});

test("자녀 링크 [공유]: 자녀용 링크와 '부모님께는 보내지 마세요'만 보낸다", async ({ page }) => {
  const trip = await seedTrip();
  await recordShares(page);
  await page.goto(`/f/${trip.familyToken}`);
  await expect(page.getByText("카카오톡 '나와의 채팅'에 보내 두면")).toBeVisible();
  await page.getByRole("button", { name: "자녀 링크 공유" }).click();
  const text = await lastShare(page);
  expect(text).toContain("자녀용 링크(부모님께는 보내지 마세요)");
  expect(text).toContain(`/f/${trip.familyToken}`);
  expect(text).not.toContain(trip.seniorToken);
});

test("부모님 링크 [공유]: 일정 글 + 부모님 링크를 공유 창으로 보낸다", async ({ page }) => {
  const trip = await seedTrip();
  await recordShares(page);
  await page.goto(`/f/${trip.familyToken}`);
  await page.getByRole("button", { name: "부모님 링크 공유" }).click();
  const text = await lastShare(page);
  expect(text).toContain(trip.course.title);
  expect(text.trimEnd()).toMatch(new RegExp(`/t/${trip.seniorToken}$`));
  expect(text).not.toContain(trip.familyToken);
});

test.describe("PC", () => {
  test.use({
    userAgent: devices["Desktop Chrome"].userAgent,
    viewport: { width: 1280, height: 800 },
    isMobile: false,
    hasTouch: false,
  });

  test("인쇄 · 이미지: 공유 창 대신 [이미지로 저장하기] · [글 복사]와 PC 카카오톡 안내", async ({
    page,
  }) => {
    const trip = await seedTrip();
    await page.goto(`/f/${trip.familyToken}/print`);
    await expect(page.getByRole("button", { name: "이미지로 저장하기" })).toBeVisible();
    await expect(page.getByRole("button", { name: "글 복사" })).toBeVisible();
    await expect(page.getByRole("button", { name: "이미지로 공유하기" })).toHaveCount(0);
    await expect(page.getByText("PC 카카오톡 대화방에 끌어다 놓고")).toBeVisible();

    // 링크 카드도 공유 창 대신 복사: 부모님 [링크 복사][일정 글 복사] · 자녀 [링크 복사]만
    await page.goto(`/f/${trip.familyToken}`);
    await expect(page.getByRole("button", { name: "일정 글 복사" })).toBeVisible();
    await expect(page.getByRole("button", { name: "부모님 링크 복사" })).toBeVisible();
    await expect(page.getByRole("button", { name: "자녀 링크 복사" })).toBeVisible();
    await expect(page.getByRole("button", { name: /링크 공유$/ })).toHaveCount(0);
    // 넓은 화면은 예정 | 실제 머리글
    await expect(page.getByText("실제 (사진)").first()).toBeVisible();
  });
});

// 버튼 줄이 카드(또는 화면) 오른쪽 끝을 넘지 않는지
async function buttonsInside(page: Page, scope: string) {
  const out = await page.evaluate((sel) => {
    const bad: string[] = [];
    for (const box of document.querySelectorAll<HTMLElement>(sel)) {
      const edge = box.getBoundingClientRect().right + 0.5;
      for (const b of box.querySelectorAll<HTMLElement>("a, button")) {
        const r = b.getBoundingClientRect();
        if (r.width > 0 && r.right > edge) bad.push(b.getAttribute("aria-label") ?? b.textContent);
      }
    }
    return { bad, overflow: document.documentElement.scrollWidth > window.innerWidth };
  }, scope);
  expect(out.bad).toEqual([]);
  expect(out.overflow).toBe(false);
}

for (const width of [375, 390, 1280]) {
  test(`${String(width)}px: 코스 상세 · 여유가 있으면 · 자녀 일정 카드의 버튼이 카드 안에 들어온다`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const course = firstCourse();
    await page.goto(`/result/${course.key}?${resultQuery()}`);
    // 장소 데이터를 처음 읽을 때는 15초를 넘길 수 있다 (전체 실행 순서에서만)
    await expect(page.getByRole("article").first()).toBeVisible({ timeout: 30_000 });
    const spare = page.locator("details", { hasText: "여유가 있으면" });
    if ((await spare.count()) > 0) await spare.locator("summary").click();
    await buttonsInside(page, "article, details");

    const trip = await seedTrip();
    await page.goto(`/f/${trip.familyToken}`);
    await expect(page.getByRole("button", { name: /주소 복사/ }).first()).toBeVisible();
    await buttonsInside(page, "li");
  });
}
