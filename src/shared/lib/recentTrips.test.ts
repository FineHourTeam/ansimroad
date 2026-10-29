import { beforeEach, describe, expect, it } from "vitest";
import { recentTrips, rememberTrip, themeName } from "./recentTrips";

const trip = (token: string, date: string, theme = "바다 코스") => ({ token, date, theme });

describe("최근 만든 여행", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("확정한 여행을 날짜 순으로 보여 주고 같은 링크는 한 번만 남긴다", () => {
    rememberTrip(trip("F2", "2026-11-05"), "2026-10-29");
    rememberTrip(trip("F1", "2026-10-30"), "2026-10-29");
    rememberTrip(trip("F2", "2026-11-05", "역사·문화 코스"), "2026-10-29");
    expect(recentTrips("2026-10-29")).toEqual([
      trip("F1", "2026-10-30"),
      trip("F2", "2026-11-05", "역사·문화 코스"),
    ]);
  });

  it("여행일 + 30일이 지나면 목록과 기기에서 뺀다", () => {
    rememberTrip(trip("F1", "2026-10-01"), "2026-10-01");
    expect(recentTrips("2026-10-31")).toHaveLength(1);
    expect(recentTrips("2026-11-01")).toEqual([]);
    expect(localStorage.getItem("sr.recentTrips")).toBeNull();
  });

  it("최근에 확정한 5개까지만", () => {
    for (let i = 1; i <= 6; i += 1)
      rememberTrip(trip(`F${String(i)}`, `2026-11-0${String(i)}`), "2026-10-29");
    expect(recentTrips("2026-10-29").map((t) => t.token)).toEqual(["F2", "F3", "F4", "F5", "F6"]);
  });

  it("토큰 · 날짜 · 테마 말고는 담지 않는다", () => {
    rememberTrip({ ...trip("F1", "2026-10-30"), memo: "아빠" } as never, "2026-10-29");
    expect(JSON.parse(localStorage.getItem("sr.recentTrips") ?? "[]")).toEqual([
      trip("F1", "2026-10-30"),
    ]);
  });

  it("깨진 값은 무시한다", () => {
    localStorage.setItem("sr.recentTrips", "{not json");
    expect(recentTrips("2026-10-29")).toEqual([]);
  });

  it("테마 이름: 테마 코스 · 대표 코스 · 운영진 추천 코스", () => {
    expect(themeName({ key: "바다", theme: "바다" } as never)).toBe("바다 코스");
    expect(themeName({ key: "best", theme: null } as never)).toBe("목포 대표 코스");
    expect(themeName({ key: "curated-abc", theme: null } as never)).toBe("추천 코스");
  });
});
