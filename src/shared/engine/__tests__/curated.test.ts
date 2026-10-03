import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePlaceRows } from "@/shared/data/placeSchema";
import { parseCsv } from "@/shared/data/csv";
import { curatedToCourse } from "@/shared/lib/curated";
import type { CuratedCourse } from "@/shared/domain/types";

function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined)
    throw new Error(`index ${String(i)} out of range (length ${String(arr.length)})`);
  return v;
}

const places = parsePlaceRows(
  parseCsv(readFileSync(resolve(__dirname, "../../../../public/data/places.demo.csv"), "utf8")),
).places;
const known = at(places, 0);

const c: CuratedCourse = {
  id: "abc",
  title: "목포 바다 한 바퀴",
  summary: "",
  published: true,
  updatedAt: "2026-10-03T00:00:00Z",
  stops: [
    {
      id: "s1",
      placeId: known.id,
      name: "케이블카 (운영진 이름)",
      lat: known.lat,
      lng: known.lng,
      role: "am",
      stayMin: 50,
      desc: "설명",
      photos: ["https://x/1.jpg", "https://x/2.jpg"],
    },
    {
      id: "s2",
      name: "바닷가 벤치",
      lat: known.lat + 0.01,
      lng: known.lng + 0.01,
      role: "pm",
      stayMin: 30,
      desc: "",
      photos: [],
    },
  ],
};

describe("운영진 추천 코스 → 코스", () => {
  const course = curatedToCourse(c, places);
  it("키는 c-{id}, 10:00 출발, 머무는 시간대로 이어진다", () => {
    expect(course.key).toBe("c-abc");
    expect(at(course.stops, 0).arriveMin).toBe(600);
    expect(at(course.stops, 1).arriveMin).toBe(600 + 50 + at(course.stops, 1).travelMin);
  });
  it("등록된 장소는 접근성 정보를 쓰고 이름 · 사진 · 설명은 운영진 값으로 덮어쓴다", () => {
    const p = at(course.stops, 0).place;
    expect(p.id).toBe(known.id);
    expect(p.wheelchair).toBe(known.wheelchair);
    expect(p.name).toBe("케이블카 (운영진 이름)");
    expect(p.photoUrls).toHaveLength(2);
    expect(p.desc).toBe("설명");
  });
  it("지도에서 찍은 새 위치는 미확인 장소로 (확인 배지 없음)", () => {
    const p = at(course.stops, 1).place;
    expect(p.id).toBe("custom-s2");
    expect(p.verify).toBe("미확인");
    expect(p.photoUrl).toBeNull();
  });
});
