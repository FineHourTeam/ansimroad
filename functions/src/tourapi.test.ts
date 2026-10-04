import assert from "node:assert/strict";
import { test } from "node:test";
import { apiPath, upstreamUrl } from "./tourapi.js";

test("허용한 API 경로만 통과한다", () => {
  assert.equal(apiPath("/api/tourapi/KorService2/searchKeyword2"), "KorService2/searchKeyword2");
  assert.equal(apiPath("/KorWithService2/detailWithTour2"), "KorWithService2/detailWithTour2");
  assert.equal(apiPath("/api/tourapi/KorService2/../../etc"), null);
  assert.equal(apiPath("/api/tourapi/KorService2/areaCode2"), null);
});

test("클라이언트가 보낸 serviceKey 는 버리고 서버 키를 붙인다", () => {
  const url = new URL(
    upstreamUrl(
      "KorService2/searchKeyword2",
      { keyword: "목포", serviceKey: "evil", n: ["a"] },
      "SERVER",
    ),
  );
  assert.equal(
    url.origin + url.pathname,
    "https://apis.data.go.kr/B551011/KorService2/searchKeyword2",
  );
  assert.equal(url.searchParams.get("keyword"), "목포");
  assert.equal(url.searchParams.getAll("serviceKey").join(), "SERVER");
  assert.equal(url.searchParams.get("n"), null);
});
