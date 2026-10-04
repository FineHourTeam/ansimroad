import { describe, expect, it } from "vitest";
import type { Course, GenerateResult, Place, PublicReview, Stop } from "@/shared/domain/types";
import { averageRating, pickCourse, routeLine } from "./courses";

const place = (id: string, name: string) => ({ id, name }) as Place;
const stop = (role: Stop["role"], p: Place) => ({ role, place: p }) as Stop;
const course = (key: Course["key"], stops: Stop[] = []) => ({ key, stops }) as Course;

describe("routeLine", () => {
  it("점심은 '점심(이름)'으로 이어 쓴다", () => {
    const c = course("sea", [
      stop("am", place("a", "케이블카")),
      stop("lunch", place("b", "뜰채")),
      stop("cafe", place("c", "커피창고로")),
    ]);
    expect(routeLine(c)).toBe("케이블카 → 점심(뜰채) → 커피창고로");
  });
});

describe("pickCourse", () => {
  const result = {
    courses: [course("sea")],
    representative: course("best"),
  } as GenerateResult;
  const curated = [course("c-seed")];

  it("엔진 코스 · 대표 코스 · 추천 코스 순서로 찾는다", () => {
    expect(pickCourse(result, curated, "sea")?.key).toBe("sea");
    expect(pickCourse(result, curated, "best")?.key).toBe("best");
    expect(pickCourse(result, curated, "c-seed")?.key).toBe("c-seed");
  });

  it("없는 키는 null", () => {
    expect(pickCourse(result, curated, "history")).toBeNull();
  });
});

describe("averageRating", () => {
  const r = (rating: number): PublicReview => ({ rating, text: "", at: "" });
  it("소수 첫째 자리까지", () => {
    expect(averageRating([r(5), r(4), r(4)])).toBe("4.3");
  });
  it("후기가 없으면 null", () => {
    expect(averageRating([])).toBeNull();
  });
});
