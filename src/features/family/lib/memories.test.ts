import { describe, expect, it } from "vitest";
import type { Course, PhotoRecord, Place, PlaceReview, Stop } from "@/shared/domain/types";
import { memoryEntries, stampDate } from "./memories";

const place = (id: string) => ({ id, name: id, address: "" }) as unknown as Place;
const stop = (id: string): Stop => ({
  role: "am",
  place: place(id),
  arriveMin: 600,
  departMin: 660,
  stayMin: 60,
  travelMin: 0,
  waitMin: 0,
  fallback: false,
});
const course = { stops: [stop("A"), stop("B"), stop("C"), stop("D")] } as unknown as Course;
const photo = (id: string, iso: string): PhotoRecord => ({
  id,
  tripId: "t",
  takenAt: iso,
  url: `https://x/${id}.jpg`,
  width: 1,
  height: 1,
  lat: null,
  lng: null,
  locationStatus: "off",
  by: "senior",
});
const review = (text: string, priv = false): PlaceReview => ({ rating: 5, text, priv, at: "" });

describe("memoryEntries", () => {
  const p1 = photo("p1", new Date(2026, 9, 18, 10, 25).toISOString());
  const p2 = photo("p2", new Date(2026, 9, 18, 10, 40).toISOString());
  const p3 = photo("p3", new Date(2026, 9, 18, 10, 50).toISOString());

  it("사진도 멘트도 없는 장소는 빼고, 번호는 코스 순서 그대로", () => {
    const out = memoryEntries(course, [[p1], [], [], []], { C: review("바닷바람 좋았어요") });
    expect(out.map((e) => [e.index, e.stop.place.id])).toEqual([
      [0, "A"],
      [2, "C"],
    ]);
  });

  it("올린 사진은 전부 싣고, 촬영 시각은 첫 사진", () => {
    const [a] = memoryEntries(course, [[p1, p2, p3]], {});
    expect(a?.photos.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(a?.takenAt).toBe("10:25");
  });

  it("'나만 보기' 후기도 그 가족의 추억 페이지에는 쓴 그대로 싣는다", () => {
    const [b] = memoryEntries(course, [], {
      B: review("  엄마도 맵지 않다며 한 그릇 뚝딱.  ", true),
    });
    expect(b?.text).toBe("엄마도 맵지 않다며 한 그릇 뚝딱.");
    expect(b?.takenAt).toBeNull();
  });

  it("빈 후기(별점만)는 멘트로 치지 않는다", () => {
    expect(memoryEntries(course, [], { A: review("   ") })).toEqual([]);
  });

  it("도장 날짜", () => {
    expect(stampDate("2026-10-18")).toBe("2026.10.18");
  });
});
