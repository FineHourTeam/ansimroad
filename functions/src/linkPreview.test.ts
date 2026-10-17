import assert from "node:assert/strict";
import { test } from "node:test";
import { htmlOrigin, injectMeta, linkToken, previewTitle, SLOGAN } from "./linkPreview.js";

const HTML = `<head><meta property="og:site_name" content="안심로드" />
<meta property="og:title" content="안심로드" />
<meta property="og:description" content="옛 문구" /></head>`;

test("부모님 · 자녀 링크 경로에서만 토큰과 역할을 꺼낸다", () => {
  assert.deepEqual(linkToken("/t/AbCdEfGhIj"), { token: "AbCdEfGhIj", role: "senior" });
  assert.deepEqual(linkToken("/t/AbCdEfGhIj/"), { token: "AbCdEfGhIj", role: "senior" });
  assert.deepEqual(linkToken("/f/AbCdEfGhIj"), { token: "AbCdEfGhIj", role: "family" });
  assert.equal(linkToken("/t/short"), null);
  assert.equal(linkToken("/f/AbCdEfGhIj/course"), null);
  assert.equal(linkToken("/r/AbCdEfGhIj"), null);
  assert.equal(linkToken("/t/AbCdEfGhIj/../x"), null);
});

test("제목은 '안심로드 · 10월 18일 코스명'", () => {
  assert.equal(previewTitle("2026-10-18", "바다 코스"), "안심로드 · 10월 18일 바다 코스");
  assert.equal(previewTitle("2026-01-05", " 아빠 칠순 "), "안심로드 · 1월 5일 아빠 칠순");
  assert.equal(previewTitle("bad", "바다 코스"), null);
});

test("og 제목 · 설명을 바꾸고, 자녀가 쓴 코스 이름은 이스케이프한다", () => {
  const out = injectMeta(HTML, { title: '안심로드 · 10월 18일 "엄마"<b>&', description: SLOGAN });
  assert.match(out, /og:title" content="안심로드 · 10월 18일 &#34;엄마&#34;&#60;b&#62;&#38;"/);
  assert.match(out, new RegExp(`og:description" content="${SLOGAN}"`));
  assert.match(out, /og:site_name" content="안심로드"/);
  assert.doesNotMatch(out, /옛 문구/);
  // '$' 가 든 이름도 그대로
  const dollar = injectMeta(HTML, { title: "안심로드 · 1월 1일 $' $&", description: SLOGAN });
  assert.match(dollar, /og:title" content="안심로드 · 1월 1일 \$&#39; \$&#38;"/);
});

test("HTML 은 Firebase Hosting 주소에서만 가져온다", () => {
  assert.equal(htmlOrigin("ansimroad.web.app"), "https://ansimroad.web.app");
  assert.equal(htmlOrigin("ansimroad--pr3-abc.web.app"), "https://ansimroad--pr3-abc.web.app");
  assert.equal(htmlOrigin("evil.example.com"), "https://ansimroad.web.app");
  assert.equal(htmlOrigin(undefined), "https://ansimroad.web.app");
});
