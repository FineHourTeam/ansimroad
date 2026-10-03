import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { changeStay, removeStop, shiftStart } from "@/shared/lib/courseEdit";
import { parseCsv } from "@/shared/data/csv";
import { parsePlaceRows } from "@/shared/data/placeSchema";
import type { TripInput } from "@/shared/domain/types";
import { generateCourses } from "@/shared/engine/generate";
import { nowLinePosition } from "@/shared/engine/timeline";

function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined)
    throw new Error(`index ${String(i)} out of range (length ${String(arr.length)})`);
  return v;
}

const places = parsePlaceRows(
  parseCsv(readFileSync(resolve(__dirname, "../../../../public/data/places.demo.csv"), "utf8")),
).places;
const T1: TripInput = {
  party: 2,
  age: 70,
  mobility: "none",
  walk: 30,
  date: "2026-10-18",
  transport: "car",
};
const course = at(generateCourses(places, T1, { emergencyByRegion: {} }).courses, 0);

describe("확정 후 코스 수정", () => {
  it("머무는 시간을 늘리면 뒤 일정이 같이 밀린다", () => {
    const next = changeStay(course, 0, 10);
    expect(at(next.stops, 0).stayMin).toBe(at(course.stops, 0).stayMin + 10);
    expect(at(next.stops, 1).arriveMin).toBe(
      at(next.stops, 0).departMin + at(next.stops, 1).travelMin,
    );
  });

  it("출발을 늦추면 모든 도착 시각이 같은 만큼 밀린다", () => {
    const base = shiftStart(course, 0);
    const next = shiftStart(course, 20);
    next.stops.forEach((s, i) => {
      expect(s.arriveMin - at(base.stops, i).arriveMin).toBe(20);
    });
  });

  it("장소를 빼면 하나 줄고, 마지막 하나는 빼지 않는다", () => {
    expect(removeStop(course, 1).stops).toHaveLength(course.stops.length - 1);
    let c = course;
    while (c.stops.length > 1) c = removeStop(c, 0);
    expect(removeStop(c, 0).stops).toHaveLength(1);
  });
});

describe("지금 시각 빨간 선 위치", () => {
  const a = at(course.stops, 0);
  const b = at(course.stops, 1);
  it("출발 전이면 첫 카드 앞", () => {
    expect(nowLinePosition(course, a.arriveMin - 5)).toEqual({ kind: "before", index: 0 });
  });
  it("머무는 중이면 그 카드 안, 비율로", () => {
    const mid = a.arriveMin + (a.departMin - a.arriveMin) / 2;
    expect(nowLinePosition(course, mid)).toEqual({ kind: "inside", index: 0, pct: 50 });
  });
  it("이동 중이면 다음 카드 앞", () => {
    expect(nowLinePosition(course, b.arriveMin - 1)).toEqual({ kind: "before", index: 1 });
  });
  it("일정이 끝났으면 맨 뒤", () => {
    expect(nowLinePosition(course, course.endMin + 30)).toEqual({ kind: "after" });
  });
});
