import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/shared/data/csv";
import { parsePlaceRows } from "@/shared/data/placeSchema";
import type { PhotoRecord, TripInput } from "@/shared/domain/types";
import { generateCourses } from "@/shared/engine/generate";
import { photosBySlot } from "@/shared/engine/timeline";
import { changeStay, removeStop } from "@/shared/lib/courseEdit";
import { bannerText, isPast, photoWhere } from "./familyView";

const places = parsePlaceRows(
  parseCsv(readFileSync(resolve(__dirname, "../../../../public/data/places.demo.csv"), "utf8")),
).places;
const DATE = "2026-10-18";
const input: TripInput = {
  party: 2,
  age: 70,
  mobility: "none",
  walk: 30,
  date: DATE,
  transport: "car",
};
const generated = generateCourses(places, input, { emergencyByRegion: {} }).courses[0];
if (!generated) throw new Error("테스트 코스가 만들어지지 않아요");
const course = changeStay(generated, 0, 0); // 시간표를 앞에서부터 다시 계산한 코스 (점심 대기 없음)
const stop = (i: number) => {
  const s = course.stops[i];
  if (!s) throw new Error(`장소 ${String(i)} 없음`);
  return s;
};
const iso = (min: number) =>
  new Date(
    `${DATE}T${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}:00`,
  ).toISOString();
const photo = (min: number, extra: Partial<PhotoRecord> = {}): PhotoRecord => ({
  id: `p${String(min)}`,
  tripId: "t",
  takenAt: iso(min),
  url: "",
  width: 1,
  height: 1,
  lat: null,
  lng: null,
  locationStatus: "off",
  by: "senior",
  ...extra,
});

describe("isPast", () => {
  it("여행 전이면 모두 아직, 지난 날이면 모두 지남, 당일은 시각 비교", () => {
    expect(isPast("2026-10-17", DATE, 600, 0)).toBe(false);
    expect(isPast("2026-10-19", DATE, 600, 0)).toBe(true);
    expect(isPast(DATE, DATE, 600, 599)).toBe(false);
    expect(isPast(DATE, DATE, 600, 600)).toBe(true);
  });
});

describe("photosBySlot", () => {
  it("자녀가 고른 칸은 그대로, 나머지는 찍은 시각의 예정 장소로", () => {
    const slots = photosBySlot(
      course,
      [photo(stop(1).arriveMin + 5), photo(stop(0).arriveMin, { stopIndex: 2, by: "family" })],
      false,
    );
    expect(slots.map((s) => s.length)).toEqual(
      course.stops.map((_, i) => (i === 1 || i === 2 ? 1 : 0)),
    );
  });

  it("코스를 고쳐 칸이 줄면 마지막 칸에 붙인다", () => {
    const shorter = removeStop(course, 3);
    const slots = photosBySlot(shorter, [photo(600, { stopIndex: 3 })], false);
    expect(slots[shorter.stops.length - 1]).toHaveLength(1);
  });
});

describe("bannerText", () => {
  const base = {
    course,
    date: DATE,
    expiresOn: "2026-11-17",
    locationOn: false,
    completed: false,
  };
  it("여행 전: 남은 날과 출발 시각 (전날 미리 온 사진이 있어도)", () => {
    const b = bannerText({ ...base, photos: [], today: "2026-10-11", nowMin: 0 });
    expect(b.main).toBe("여행까지 7일 남았어요");
    expect(b.sub).toMatch(/^\d{2}:\d{2} 출발 · 부모님께 링크를 보내 두세요$/);
    const eve = bannerText({ ...base, photos: [photo(600)], today: "2026-10-17", nowMin: 0 });
    expect(eve.main).toBe("내일이 여행 날이에요");
  });

  it("당일 출발 전 사진 없음: 첫 사진을 기다리는 중", () => {
    const b = bannerText({ ...base, photos: [], today: DATE, nowMin: course.startMin - 1 });
    expect(b.main).toBe("아직 첫 사진이 오지 않았어요");
    expect(b.sub).toMatch(/^\d{2}:\d{2} 출발 예정$/);
  });

  it("당일 사진 없음: 지금쯤 예정 장소", () => {
    const b = bannerText({ ...base, photos: [], today: DATE, nowMin: stop(1).arriveMin + 1 });
    expect(b.main).toBe(`지금쯤 ${stop(1).place.name} 일정`);
    expect(b.sub).toBe("아직 사진은 없어요");
  });

  it("마지막 사진 기준 지금쯤", () => {
    const b = bannerText({
      ...base,
      photos: [photo(stop(2).arriveMin)],
      today: DATE,
      nowMin: stop(2).arriveMin + 5,
    });
    expect(b.tone).toBe("ok");
    expect(b.main).toBe(`지금쯤 ${stop(2).place.name} 일정`);
    expect(b.sub).toMatch(/^\d{2}:\d{2} 마지막 사진$/);
  });

  it("일정보다 일찍 여행 완료를 눌렀으면 끝난 여행으로", () => {
    const b = bannerText({
      ...base,
      completed: true,
      photos: [photo(stop(0).arriveMin)],
      today: DATE,
      nowMin: stop(1).arriveMin,
    });
    expect(b.main).toBe("여행이 끝났어요 · 사진 1장");
  });

  it("여행이 끝나면 사진 수와 보관 기한", () => {
    const b = bannerText({
      ...base,
      photos: [photo(600), photo(700)],
      today: "2026-10-19",
      nowMin: 0,
    });
    expect(b.main).toBe("여행이 끝났어요 · 사진 2장");
    expect(b.sub).toBe("사진을 볼 수 있는 마지막 날 · 11월 17일");
  });

  it("위치 ON이면 300m 안 장소를 근처로", () => {
    const p = photo(stop(0).arriveMin, { lat: stop(3).place.lat, lng: stop(3).place.lng });
    const b = bannerText({
      ...base,
      locationOn: true,
      photos: [p],
      today: DATE,
      nowMin: stop(0).arriveMin,
    });
    expect(b.main).toBe(`지금 ${stop(3).place.name} 근처`);
    expect(b.sub).toMatch(/^\d{2}:\d{2} 마지막 사진 · 예정대로 진행 중이에요$/);
  });
});

describe("photoWhere", () => {
  it("위치 OFF: 찍은 시각의 예정 장소", () => {
    expect(photoWhere(course, photo(stop(1).arriveMin), false)).toEqual({
      kind: "scheduled",
      name: stop(1).place.name,
    });
  });
  it("자녀가 고른 칸이 시각 · 위치보다 먼저 (칸이 줄었으면 마지막 칸)", () => {
    const picked = photo(stop(2).arriveMin, { stopIndex: 1 });
    expect(photoWhere(course, picked, false)).toEqual({ kind: "picked", name: stop(1).place.name });
    expect(photoWhere(course, picked, true)).toEqual({ kind: "picked", name: stop(1).place.name });
    const last = course.stops.length - 1;
    expect(photoWhere(course, photo(600, { stopIndex: 99 }), false)).toEqual({
      kind: "picked",
      name: stop(last).place.name,
    });
  });
  it("위치 ON: 좌표가 없으면 none, 멀면 outside", () => {
    expect(photoWhere(course, photo(600), true)).toEqual({ kind: "none" });
    const far = photoWhere(course, photo(600, { lat: 35.5, lng: 127 }), true);
    expect(far.kind).toBe("outside");
  });
});
