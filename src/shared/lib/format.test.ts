import { describe, expect, it } from "vitest";
import { erDisplayName, naverDirectionsLink } from "./format";

describe("naverDirectionsLink", () => {
  const place = { name: "목포 해상케이블카", lat: 34.799416, lng: 126.370053 };

  it("목적지를 '경도,위도,이름' 으로 넣는다 (자동차)", () => {
    expect(naverDirectionsLink(place)).toBe(
      `https://map.naver.com/p/directions/-/126.370053,34.799416,${encodeURIComponent("목포 해상케이블카")},,/-/car`,
    );
  });

  it("택시 · 버스로 가면 대중교통 길찾기", () => {
    expect(naverDirectionsLink(place, "transit")).toMatch(/\/-\/transit$/);
  });
});

describe("erDisplayName", () => {
  it("법인 앞머리를 뗀다", () => {
    expect(erDisplayName("의료법인해민의료재단세안종합병원")).toBe("세안종합병원");
  });
});
