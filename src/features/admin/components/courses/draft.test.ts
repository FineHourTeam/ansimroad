import { describe, expect, it } from "vitest";
import {
  coursePoints,
  MAX_STOPS,
  photoUrl,
  roleFor,
  saveProblem,
  stepStay,
  stopAt,
  stopFromPlace,
} from "./draft";
import type { Place } from "@/shared/domain/types";
import { curatedPlace } from "@/shared/lib/curated";

function place(id: string, type: Place["type"], stayMin: number | null): Place {
  const base = curatedPlace(stopAt(id, 34.8, 126.4, 0), []);
  return { ...base, id, name: `장소${id}`, type, stayMin };
}

describe("추천 코스 만들기 로직", () => {
  it("장소 종류로 구분을 짐작한다", () => {
    expect(roleFor("식당", 0)).toBe("lunch");
    expect(roleFor("카페휴식", 3)).toBe("cafe");
    expect(roleFor("관광지", 0)).toBe("am");
    expect(roleFor("관광지", 2)).toBe("pm");
  });

  it("등록 장소를 넣으면 머무는 시간을 가져오고, 없으면 40분", () => {
    expect(stopFromPlace(place("A1", "관광지", 70), 0)).toMatchObject({
      placeId: "A1",
      role: "am",
      stayMin: 70,
    });
    expect(stopFromPlace(place("A2", "식당", null), 1)).toMatchObject({
      role: "lunch",
      stayMin: 40,
    });
  });

  it("머무는 시간은 10~240분", () => {
    expect(stepStay(10, -10)).toBe(10);
    expect(stepStay(235, 10)).toBe(240);
    expect(stepStay(45, -10)).toBe(35);
  });

  it("이름과 장소가 있어야 저장한다", () => {
    expect(saveProblem({ title: "  ", stops: [] })).toBe("코스 이름을 적어 주세요");
    expect(saveProblem({ title: "바다", stops: [] })).toBe("지도에서 장소를 하나 이상 골라 주세요");
    expect(saveProblem({ title: "바다", stops: [stopAt("새 장소", 1, 2, 0)] })).toBeNull();
  });

  it("장소가 10곳을 넘으면 저장하지 않는다 (확정 때 보안 규칙이 막는다)", () => {
    const stops = (n: number) =>
      Array.from({ length: n }, (_, i) => stopAt(`장소${String(i)}`, 1, 2, i));
    expect(saveProblem({ title: "바다", stops: stops(MAX_STOPS) })).toBeNull();
    expect(saveProblem({ title: "바다", stops: stops(MAX_STOPS + 1) })).toBe(
      "장소는 10곳까지 넣을 수 있어요",
    );
  });

  it("사진 주소는 http(s)만", () => {
    expect(photoUrl(" https://a.test/b.jpg ")).toBe("https://a.test/b.jpg");
    expect(photoUrl("javascript:alert(1)")).toBeNull();
    expect(photoUrl("그냥 글")).toBeNull();
  });

  it("코스에 넣은 장소는 회색 점에서 빠진다", () => {
    const a = place("A1", "관광지", 60);
    const b = place("A2", "식당", 60);
    const pts = coursePoints([stopFromPlace(a, 0)], [a, b]);
    expect(pts.map((p) => [p.kind, p.label, p.name])).toEqual([
      ["stop", "1", "장소A1"],
      ["cand", "+", "장소A2"],
    ]);
    expect(pts[1]?.id).toBe("place:A2");
    expect(pts[1]?.hint).toBe(" (눌러서 추가)"); // 이름표엔 이름만, 누름 안내는 읽기용
  });
});
