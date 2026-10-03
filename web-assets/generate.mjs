// 웹 에셋 생성 — /generate-web-assets 스킬의 Step 1~3을 ImageMagick 없이 Playwright로 수행한다.
// 입력: web-assets/logo-source/logo.svg · web-assets/og.json · web-assets/og-template/og.html
// 출력: public/favicon.ico(16·32·48) · apple-touch-icon.png · icons/icon-192·512·maskable-512.png · og-image.png
// 실행: node web-assets/generate.mjs
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const svg = readFileSync(join(ROOT, "web-assets/logo-source/logo.svg"), "utf8");
const BRAND = "#0F766E"; // tokens.css --primary
const og = JSON.parse(readFileSync(join(ROOT, "web-assets/og.json"), "utf8"));

const browser = await chromium.launch();
const page = await browser.newPage();

async function renderLogo(size, padRatio = 0, bg = "transparent") {
  const inner = Math.round(size * (1 - padRatio));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${bg}">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  );
  return page.screenshot({ omitBackground: bg === "transparent", type: "png" });
}

mkdirSync(join(ROOT, "public/icons"), { recursive: true });
const out = (p, buf) => writeFileSync(join(ROOT, "public", p), buf);

out("apple-touch-icon.png", await renderLogo(180));
out("icons/icon-192.png", await renderLogo(192));
out("icons/icon-512.png", await renderLogo(512));
// maskable: 로고를 80%로 줄이고 브랜드색 바탕 (Android 원형 마스크 안전영역)
out("icons/icon-maskable-512.png", await renderLogo(512, 0.2, BRAND));

// favicon.ico — PNG 엔트리 3개(16·32·48)를 ICO 컨테이너로 묶는다
const pngs = [16, 32, 48];
const images = [];
for (const s of pngs) images.push(await renderLogo(s));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = 6 + 16 * images.length;
const entries = images.map((buf, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(pngs[i], 0);
  e.writeUInt8(pngs[i], 1);
  e.writeUInt16LE(1, 4); // planes
  e.writeUInt16LE(32, 6); // bpp
  e.writeUInt32LE(buf.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += buf.length;
  return e;
});
out("favicon.ico", Buffer.concat([header, ...entries, ...images]));

// OG 이미지 1200×630
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(pathToFileURL(join(ROOT, "web-assets/og-template/og.html")).href);
await page.evaluate((t) => {
  document.getElementById("name").textContent = t.name;
  document.getElementById("tagline").textContent = t.tagline;
  document.getElementById("sub").textContent = t.sub;
}, og);
await page.evaluate(() => document.fonts.ready);
out("og-image.png", await page.screenshot({ type: "png" }));

await browser.close();
console.log("웹 에셋 생성 완료: favicon.ico · apple-touch-icon · icons/* · og-image.png");
