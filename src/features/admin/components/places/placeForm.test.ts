import { describe, expect, it } from "vitest";
import {
  csvPreview,
  draftProblem,
  fillBlanks,
  filterRecords,
  nextId,
  placePoints,
  recordFrom,
  tourIds,
} from "./placeForm";
import { emptyRecord, type PlaceRecord } from "@/shared/data/placeRecords";

const rec = (p: Partial<PlaceRecord>): PlaceRecord => ({ ...emptyRecord(), ...p });
const valid = rec({
  ID: "N0001",
  장소명: "갓바위",
  유형: "관광지",
  권역: "갓바위권",
  위도: "34.79",
  경도: "126.42",
});

describe("장소 데이터 편집 로직", () => {
  it("새 ID는 N 번호 중 가장 큰 값 + 1", () => {
    expect(nextId([])).toBe("N0001");
    expect(nextId([rec({ ID: "A0018" }), rec({ ID: "N0009" }), rec({ ID: "N0002" })])).toBe(
      "N0010",
    );
  });

  it("검색은 장소명 · ID · 권역, 보기는 빠진 곳 · 확인 안 된 곳", () => {
    const list = [
      valid,
      rec({ ID: "A1", 장소명: "평화광장", 권역: "평화광장권", 확인상태: "현장" }),
    ];
    expect(filterRecords(list, "평화", "all", new Map()).map((r) => r.ID)).toEqual(["A1"]);
    expect(filterRecords(list, "N00", "all", new Map()).map((r) => r.ID)).toEqual(["N0001"]);
    expect(filterRecords(list, "", "unverified", new Map()).map((r) => r.ID)).toEqual(["N0001"]);
    expect(filterRecords(list, "", "skipped", new Map([["A1", "x"]])).map((r) => r.ID)).toEqual([
      "A1",
    ]);
  });

  it("저장 전 검사: ID 규칙 · 새 장소 ID 중복 · 시트 규칙", () => {
    expect(draftProblem(valid, [], true)).toBeNull();
    expect(draftProblem({ ...valid, ID: "a/b" }, [], true)).toContain("ID");
    expect(draftProblem(valid, [valid], true)).toContain("같은 ID");
    expect(draftProblem(valid, [valid], false)).toBeNull();
    expect(draftProblem({ ...valid, 위도: "999" }, [], true)).toBe(
      "위도·경도가 국내 범위를 벗어남",
    );
    expect(draftProblem({ ...valid, 권역: "" }, [], true)).toContain("권역");
  });

  it("빈 칸 채우기: 채운 칸은 그대로, 비고는 덧붙이고 사진은 합친다", () => {
    const cur = rec({ ...valid, 주소: "원래 주소", 비고: "메모", 사진URL: "https://a/1.jpg" });
    const next = fillBlanks(cur, {
      주소: "관광공사 주소",
      전화: "061-000",
      비고: "TourAPI contentid=9",
      사진URL: "https://a/1.jpg | https://a/2.jpg",
    });
    expect(next.주소).toBe("원래 주소");
    expect(next.전화).toBe("061-000");
    expect(next.비고).toBe("메모\nTourAPI contentid=9");
    expect(next.사진URL).toBe("https://a/1.jpg | https://a/2.jpg");
  });

  it("관광공사 값으로 새 장소: ID는 바꾸지 않는다", () => {
    const r = recordFrom(rec({ ID: "N0003" }), { 장소명: "갓바위", 비고: "TourAPI contentid=42" });
    expect(r.ID).toBe("N0003");
    expect(r.장소명).toBe("갓바위");
    expect(tourIds([r])).toEqual(new Set(["42"]));
  });

  it("지도 점: 좌표 없는 곳은 빼고, 지금 장소는 맨 앞 ★", () => {
    const pts = placePoints(
      [valid, rec({ ID: "X" })],
      rec({ ID: "NEW", 위도: "34.8", 경도: "126.4" }),
    );
    expect(pts.map((p) => [p.id, p.kind])).toEqual([
      ["NEW", "stop"],
      ["N0001", "cand"],
    ]);
  });

  it("CSV 미리 보기: 넣을 곳 · 뺄 행 · 덮어쓸 곳 · 코스에서 빠질 곳", () => {
    const p = csvPreview(
      [valid, rec({ ...valid, ID: "" }), rec({ ...valid, ID: "E2", 권역: "" })],
      [valid],
    );
    expect(p.ok.map((r) => r.ID)).toEqual(["N0001", "E2"]);
    expect(p.badIds).toBe(1);
    expect(p.overwrite).toBe(1);
    expect(p.skipped.map((s) => s.id)).toEqual(["E2"]);
  });

  it("CSV 미리 보기: 같은 ID 가 두 줄이면 마지막 줄 하나로 센다", () => {
    const p = csvPreview(
      [rec({ ...valid, ID: "E3", 장소명: "앞" }), rec({ ...valid, ID: "E3", 장소명: "뒤" })],
      [],
    );
    expect(p.ok.map((r) => r.장소명)).toEqual(["뒤"]);
    expect(p.badIds).toBe(0);
  });
});
