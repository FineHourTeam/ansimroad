import assert from "node:assert/strict";
import { test } from "node:test";
import { proxyTarget } from "./imgProxy.js";

test("관광공사 사진 주소만 받아 준다", () => {
  assert.equal(
    proxyTarget("https://tong.visitkorea.or.kr/cms/resource/12/1234_image2_1.jpg")?.hostname,
    "tong.visitkorea.or.kr",
  );
  assert.ok(proxyTarget("http://tong.visitkorea.or.kr/cms/a.jpg"));
});

test("다른 서버 · 이상한 주소는 막는다 (열린 중계 금지)", () => {
  assert.equal(proxyTarget("https://evil.example.com/a.jpg"), null);
  assert.equal(proxyTarget("https://tong.visitkorea.or.kr.evil.com/a.jpg"), null);
  assert.equal(proxyTarget("https://user:pw@tong.visitkorea.or.kr/a.jpg"), null);
  assert.equal(proxyTarget("https://tong.visitkorea.or.kr:8080/a.jpg"), null);
  assert.equal(proxyTarget("file:///etc/passwd"), null);
  assert.equal(proxyTarget("javascript:alert(1)"), null);
  assert.equal(proxyTarget(""), null);
  assert.equal(proxyTarget(["https://tong.visitkorea.or.kr/a.jpg"]), null);
});
