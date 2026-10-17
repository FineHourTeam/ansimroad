import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePlaceRows } from "@/shared/data/placeSchema";
import { parseCsv } from "@/shared/data/csv";
import { curatedFits, curatedToCourse, firstOpenDate } from "@/shared/lib/curated";
import { weekdayOf } from "@/shared/lib/date";
import type { CuratedCourse, EmergencyInfo, TripInput } from "@/shared/domain/types";

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

  it("장소 데이터에 응급실이 없으면 권역별 응급실(설정값)로 채운다 (P8)", () => {
    const er: EmergencyInfo = { name: "목포시의료원", phone: "061-260-6400", driveMin: 10 };
    const noEr = places.map((p) => (p.id === known.id ? { ...p, er: null } : p));
    expect(curatedToCourse(c, noEr, 600, { [known.region]: er }).er).toEqual(er);
  });
});

describe("운영진 추천 코스도 이동조건 · 그날 휴무는 지킨다 (X1 · X2 · X4 · X6)", () => {
  const input: TripInput = {
    party: 2,
    age: 70,
    mobility: "none",
    walk: 30,
    date: "2026-10-18",
    transport: "car",
  };
  const onlyKnown: CuratedCourse = { ...c, stops: c.stops.slice(0, 1) };

  it("이동조건이 없으면 지도에서 찍은 미확인 장소가 있어도 보여 준다", () => {
    expect(curatedFits(curatedToCourse(c, places), input)).toBe(true);
  });
  it("계단 · 휠체어면 미확인 장소(X6)가 든 추천 코스는 뺀다", () => {
    const course = curatedToCourse(c, places);
    expect(curatedFits(course, { ...input, mobility: "stairs" })).toBe(false);
    expect(curatedFits(course, { ...input, mobility: "wheelchair" })).toBe(false);
  });
  it("여행 날짜가 장소 휴무일이면 뺀다", () => {
    const closed = places.map((p) =>
      p.id === known.id
        ? { ...p, closedRaw: "일", closed: [{ weekday: weekdayOf(input.date), nth: null }] }
        : p,
    );
    expect(curatedFits(curatedToCourse(onlyKnown, places), input)).toBe(true);
    expect(curatedFits(curatedToCourse(onlyKnown, closed), input)).toBe(false);
  });
  it("운영진 미리보기 날짜는 코스 장소가 모두 여는 첫날 (그날 쉬면 다음 날)", () => {
    const sunday = "2026-10-18";
    const closed = places.map((p) =>
      p.id === known.id ? { ...p, closedRaw: "일", closed: [{ weekday: 0, nth: null }] } : p,
    );
    expect(firstOpenDate(curatedToCourse(onlyKnown, places), sunday)).toBe(sunday);
    expect(firstOpenDate(curatedToCourse(onlyKnown, closed), sunday)).toBe("2026-10-19");
  });
});
