import { describe, expect, it } from "vitest";
import { staticMapUrl, staticView } from "./staticMap";

// 목포 데모 장소 4곳 (케이블카 · 뜰채 · 평화광장 · 커피창고로)
const PTS = [
  { lat: 34.7997, lng: 126.3705 },
  { lat: 34.8003, lng: 126.3667 },
  { lat: 34.7967, lng: 126.431 },
  { lat: 34.8027, lng: 126.419 },
];

describe("정적 지도 보기", () => {
  it("모든 점이 가장자리 여백 안에 들어오는 가장 큰 확대 수준을 고른다", () => {
    const v = staticView(PTS, 400, 260, 40);
    const px = PTS.map(v.toPx);
    for (const p of px) {
      expect(p.x).toBeGreaterThanOrEqual(40 - 0.5);
      expect(p.x).toBeLessThanOrEqual(360 + 0.5);
      expect(p.y).toBeGreaterThanOrEqual(40 - 0.5);
      expect(p.y).toBeLessThanOrEqual(220 + 0.5);
    }
    // 한 단계 더 키우면 넘친다
    const xs = px.map((p) => p.x);
    expect((Math.max(...xs) - Math.min(...xs)) * 2).toBeGreaterThan(320);
  });

  it("중심은 점들의 가운데, 그 자리가 칸 가운데에 온다", () => {
    const v = staticView(PTS, 400, 260);
    const c = v.toPx(v.center);
    expect(c.x).toBeCloseTo(200, 5);
    expect(c.y).toBeCloseTo(130, 5);
  });

  it("2026-10-29 실측 배율: level 12 에서 네이버 마커는 일반 256 타일 계산의 두 배 거리에 찍혔다", () => {
    // 일반 계산(256·2^12)으로 뜰채는 x≈106, 네이버 마커는 x≈12 (가운데 200 에서 두 배) → 512·2^L
    const v = staticView(PTS, 400, 260);
    expect(v.level).toBe(11); // 512·2^11 = 일반 계산의 level 12
    expect(Math.round(v.toPx(PTS[1]!).x)).toBe(106);
  });

  it("한곳에 몰려도 너무 확대하지 않는다", () => {
    expect(staticView([PTS[0]!], 400, 260).level).toBe(16);
  });

  it("주소: raster-cors · scale 2 · 경도,위도 순서 · Client ID", () => {
    const v = staticView(PTS, 400, 260);
    const url = new URL(staticMapUrl("abc", v, 400, 260));
    expect(url.pathname).toBe("/map-static/v2/raster-cors");
    expect(url.searchParams.get("scale")).toBe("2");
    expect(url.searchParams.get("X-NCP-APIGW-API-KEY-ID")).toBe("abc");
    expect(url.searchParams.get("center")?.startsWith("126.")).toBe(true);
  });
});
