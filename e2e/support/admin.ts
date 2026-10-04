// 운영진 로그인 도우미 (로그인 화면: 라벨 "이메일" · "비밀번호", 버튼 "로그인하기")
import { expect, type Page } from "@playwright/test";
import { ADMIN } from "./emulator";

export async function loginAsAdmin(page: Page, to = "/admin"): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("이메일").fill(ADMIN.email);
  await page.getByLabel("비밀번호").fill(ADMIN.password);
  await page.getByRole("button", { name: "로그인하기" }).click();
  await expect(page).toHaveURL(/\/admin(?!\/login)/);
  if (to !== "/admin") await page.goto(to);
}
