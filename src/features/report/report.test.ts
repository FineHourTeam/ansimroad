import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/shared/data/csv";
import { parsePlaceRows } from "@/shared/data/placeSchema";
import type { PhotoRecord, TripInput } from "@/shared/domain/types";
import { generateCourses } from "@/shared/engine/generate";
import { photosBySlot } from "@/shared/engine/timeline";
import { hhmm } from "@/shared/lib/date";
import { averageRating, heroPhoto } from "./report";

const places = parsePlaceRows(
  parseCsv(readFileSync(resolve(__dirname, "../../../public/data/places.demo.csv"), "utf8")),
).places;
const INPUT: TripInput = {
  party: 2,
  age: 70,
  mobility: "none",
  walk: 30,
  date: "2026-10-18",
  transport: "car",
};
const course = generateCourses(places, INPUT, { emergencyByRegion: {} }).courses[0];
if (!course) throw new Error("테스트 코스가 만들어지지 않아요");

const stopAt = (i: number) => {
  const s = course.stops[i];
  if (!s) throw new Error(`장소 ${String(i)}번이 없어요`);
  return s;
};

const photo = (id: string, minuteOfDay: number, extra: Partial<PhotoRecord> = {}): PhotoRecord => ({
  id,
  tripId: "t",
  takenAt: `${INPUT.date}T${hhmm(minuteOfDay)}:00`, // 기기 시각 기준
  url: `https://example.test/${id}.jpg`,
  width: 1,
  height: 1,
  lat: null,
  lng: null,
  locationStatus: "off",
  by: "senior",
  ...extra,
});

describe("photosBySlot", () => {
  it("찍은 시각으로 장소에 묶고, 자녀가 고른 장소(stopIndex)가 먼저다", () => {
    const groups = photosBySlot(
      course,
      [
        photo("a", stopAt(0).arriveMin + 5),
        photo("b", stopAt(1).arriveMin + 1),
        photo("c", stopAt(0).arriveMin + 5, { stopIndex: 2 }),
      ],
      false,
    );
    expect(groups.map((g) => g.map((p) => p.id))).toEqual([["a"], ["b"], ["c"], []]);
  });

  it("코스에서 빠진 순번의 사진은 마지막 장소로 간다", () => {
    const groups = photosBySlot(course, [photo("x", 600, { stopIndex: 9 })], false);
    expect(groups.at(-1)?.map((p) => p.id)).toEqual(["x"]);
    expect(groups.flat()).toHaveLength(1);
  });
});

describe("averageRating", () => {
  it("나만 보기 후기는 빼고 평균을 낸다", () => {
    expect(
      averageRating({
        a: { rating: 5, text: "", priv: false, at: "" },
        b: { rating: 4, text: "", priv: false, at: "" },
        c: { rating: 1, text: "", priv: true, at: "" },
      }),
    ).toBe(4.5);
  });

  it("공개 후기가 없으면 null", () => {
    expect(averageRating({})).toBeNull();
    expect(averageRating({ a: { rating: 3, text: "", priv: true, at: "" } })).toBeNull();
  });
});

describe("heroPhoto", () => {
  const review = (rating: number, priv = false) => ({ rating, text: "", priv, at: "" });
  const groups = [[photo("a", 600)], [], [photo("c", 700), photo("d", 701)], []];

  it("공개 별점이 가장 높은 장소의 첫 사진을 고른다 (나만 보기 별점은 0으로 센다)", () => {
    const reviews = {
      [stopAt(0).place.id]: review(5, true),
      [stopAt(2).place.id]: review(4),
    };
    expect(heroPhoto(course, groups, reviews)?.id).toBe("c");
  });

  it("별점이 같거나 없으면 앞 장소, 사진이 없으면 null", () => {
    expect(heroPhoto(course, groups, {})?.id).toBe("a");
    expect(heroPhoto(course, [[], [], [], []], {})).toBeNull();
  });
});
