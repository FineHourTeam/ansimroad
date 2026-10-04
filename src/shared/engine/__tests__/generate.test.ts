/* eslint-disable no-console -- 실제 코스 결과를 기록해 기대값과 대조한다 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/shared/data/csv";
import { hhmm } from "@/shared/lib/date";
import { parseClosedDays, parsePlaceRows, countVerified } from "@/shared/data/placeSchema";
import type { Course, TripInput } from "@/shared/domain/types";
import { generateCourses } from "@/shared/engine/generate";
import { exclusionReasons, isClosedOn } from "@/shared/engine/rules";

const load = (file: string) =>
  parsePlaceRows(
    parseCsv(readFileSync(resolve(__dirname, "../../../../public/data", file), "utf8")),
  ).places;

const sample = load("places.sample.csv");
const demo = load("places.demo.csv");
const settings = { emergencyByRegion: {} };

// 부록 A.6 테스트 입력 (날짜는 2026-10-18 일요일 = 그 달 셋째 일요일)
const T1: TripInput = {
  party: 2,
  age: 70,
  mobility: "none",
  walk: 30,
  date: "2026-10-18",
  transport: "car",
};
const T2: TripInput = {
  party: 2,
  age: 70,
  mobility: "stairs",
  walk: 20,
  date: "2026-10-18",
  transport: "transit",
};
const T3: TripInput = {
  party: 1,
  age: 80,
  mobility: "wheelchair",
  walk: 10,
  date: "2026-10-18",
  transport: "car",
};
const T4: TripInput = {
  party: 3,
  age: 60,
  mobility: "none",
  walk: 20,
  date: "2026-10-11",
  transport: "transit",
};

function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined)
    throw new Error(`index ${String(i)} out of range (length ${String(arr.length)})`);
  return v;
}

const route = (c: Course) => c.stops.map((s) => `${hhmm(s.arriveMin)} ${s.place.name}`).join(" → ");

describe("장소 데이터 파싱 (D-01, D-02)", () => {
  it("샘플 10곳을 모두 읽는다", () => {
    expect(sample).toHaveLength(10);
    expect(countVerified(sample)).toBe(0);
    expect(countVerified(demo)).toBe(9);
  });

  it("전화 칸 번호 2개를 나눈다", () => {
    const p = sample.find((x) => x.id === "A0048")!;
    expect(p.phones).toEqual(["061-242-0340", "0507-1438-0462"]);
  });

  it("편안함등급 빈 칸은 A.4 기준으로 계산한다", () => {
    expect(sample.find((x) => x.id === "A0010")!.comfort).toBe("중"); // 20분
    expect(sample.find((x) => x.id === "A0044")!.comfort).toBe("상"); // 10분·실내
  });

  it("잘못된 값이 있는 행만 빠지고 나머지는 정상", () => {
    const rows = parseCsv(
      readFileSync(resolve(__dirname, "../../../../public/data/places.sample.csv"), "utf8"),
    );
    const header = at(rows, 1);
    const bad = [...at(rows, 2)];
    bad[0] = "P9999";
    bad[header.indexOf("계단")] = "조금";
    const empty = [...at(rows, 3)];
    empty[0] = "P9998";
    empty[header.indexOf("위도")] = "";
    const res = parsePlaceRows([...rows, bad, empty]);
    expect(res.places).toHaveLength(10);
    expect(res.skipped.map((s) => s.id)).toEqual(["P9999", "P9998"]);
  });
});

describe("휴무요일 해석 (X4)", () => {
  it("형식별 해석", () => {
    expect(parseClosedDays("없음")).toEqual([]);
    expect(parseClosedDays("월")).toEqual([{ weekday: 1, nth: null }]);
    expect(parseClosedDays("화·수")).toEqual([
      { weekday: 2, nth: null },
      { weekday: 3, nth: null },
    ]);
    expect(parseClosedDays("월(공휴일 시 익일)")).toEqual([{ weekday: 1, nth: null }]);
    expect(parseClosedDays("일(2·4째)")).toEqual([{ weekday: 0, nth: [2, 4] }]);
    expect(parseClosedDays("아무때나")).toBeNull();
  });

  it("'일(2·4째)'는 둘째 일요일에 빠지고 첫째·셋째 일요일에는 나온다", () => {
    const dokcheon = sample.find((x) => x.id === "A0114")!;
    expect(isClosedOn(dokcheon, "2026-10-11")).toBe(true); // 둘째 일요일
    expect(isClosedOn(dokcheon, "2026-10-04")).toBe(false); // 첫째 일요일
    expect(isClosedOn(dokcheon, "2026-10-18")).toBe(false); // 셋째 일요일
    expect(isClosedOn(dokcheon, "2026-10-25")).toBe(true); // 넷째 일요일
  });
});

describe("코스 생성 (F-04~F-07, F-12)", () => {
  it("테스트 #1: 기본 3코스, 순서 고정", () => {
    const r = generateCourses(demo, T1, settings);
    expect(r.shortage).toBe(false);
    expect(r.courses.map((c) => c.key)).toEqual(["sea", "history", "nature"]);
    for (const c of r.courses) {
      expect(c.stops.map((s) => s.role)).toEqual(["am", "lunch", "pm", "cafe"]);
      expect(c.startMin).toBe(600);
      expect(c.endMin).toBeLessThanOrEqual(990);
      expect(c.regions.length).toBeLessThanOrEqual(2);
      expect(at(c.stops, 1).arriveMin).toBeGreaterThanOrEqual(690);
      expect(at(c.stops, 1).place.region).toBe(at(c.stops, 0).place.region); // P4
    }
    // 실제 결과를 기록해 두면 기대값 대조 때 바로 비교할 수 있다
    console.log(
      r.courses
        .map(
          (c) =>
            `${c.title}${c.fallbackBadge ? " [테마 외]" : ""}: ${route(c)} ~${hhmm(c.endMin)} 걷기 ${String(c.totalWalkMin)}분`,
        )
        .join("\n"),
    );
  });

  it("같은 입력 10회 → 같은 결과 (F-12)", () => {
    const first = JSON.stringify(generateCourses(demo, T2, settings));
    for (let i = 0; i < 10; i++)
      expect(JSON.stringify(generateCourses(demo, T2, settings))).toBe(first);
  });

  it("테스트 #2: 계단 어려움 → 계단 있음·미확인·하차 200m 초과 장소 없음 (X2·X5·X6)", () => {
    const r = generateCourses(demo, T2, settings);
    for (const c of r.courses) {
      for (const s of c.stops) {
        expect(s.place.stairs).not.toBe("있음");
        expect(s.place.verify).not.toBe("미확인");
        expect(s.place.dropoffM!).toBeLessThanOrEqual(200);
      }
    }
    console.log(r.courses.map((c) => `${c.title}: ${route(c)}`).join("\n"));
  });

  it("세 코스 사이 식당은 모두 다르고 관광지 중복은 최대 1곳 (P7)", () => {
    for (const input of [T1, T2, T4]) {
      const r = generateCourses(demo, input, settings);
      const lunches = r.courses.map((c) => at(c.stops, 1).place.id);
      expect(new Set(lunches).size).toBe(lunches.length);
      for (let i = 0; i < r.courses.length; i++)
        for (let j = i + 1; j < r.courses.length; j++) {
          const ci = at(r.courses, i);
          const cj = at(r.courses, j);
          const a = new Set([at(ci.stops, 0).place.id, at(ci.stops, 2).place.id]);
          const shared = [at(cj.stops, 0).place.id, at(cj.stops, 2).place.id].filter((id) =>
            a.has(id),
          );
          expect(shared.length).toBeLessThanOrEqual(1);
        }
    }
  });

  it("테스트 #3: 휠체어·10분 → X1·X3·X6 적용, 부족하면 카드 대신 안내 (F-06)", () => {
    const r = generateCourses(demo, T3, settings);
    for (const c of r.courses) {
      for (const s of c.stops) {
        expect(s.place.wheelchair).not.toBe("불가");
        expect(s.place.walkMin!).toBeLessThanOrEqual(10);
        expect(s.place.verify).not.toBe("미확인");
      }
    }
    if (r.shortage) expect(r.courses).toHaveLength(0);
    else expect(r.courses.length).toBeGreaterThanOrEqual(2);
    console.log(
      "#3",
      r.shortage ? "부족" : r.courses.map((c) => `${c.title}: ${route(c)}`).join(" | "),
    );
  });

  it("코스가 1개만 나오면 카드 대신 안내 (F-06)", () => {
    // 관광지를 한 곳만 남기면 테마 코스를 1개 이하로만 만들 수 있다
    const onlyOne = demo.filter((p) => p.type !== "관광지" || p.id === "A0044");
    const r = generateCourses(onlyOne, T1, settings);
    expect(r.shortage).toBe(true);
    expect(r.courses).toHaveLength(0);
    expect(r.shownIds).toHaveLength(0);
  });

  it("테스트 #4: 둘째 일요일 → 독천식당 제외 (X4)", () => {
    const r = generateCourses(demo, T4, settings);
    expect(r.excludedReasons.A0114).toContain("X4");
    expect(r.courses.flatMap((c) => c.stops.map((s) => s.place.id))).not.toContain("A0114");
  });

  it("원본 샘플(전부 미확인) + 이동조건 있음 → 코스 부족 (X6)", () => {
    const r = generateCourses(sample, T2, settings);
    expect(r.shortage).toBe(true);
    expect(Object.values(r.excludedReasons).every((x) => x.includes("X6"))).toBe(true);
  });

  it("다른 코스 보기: 같은 입력 + 같은 제외 목록 → 같은 결과, 보여 준 장소는 다시 안 나옴 (F-11)", () => {
    const first = generateCourses(demo, T1, settings);
    const again1 = generateCourses(demo, T1, settings, { excluded: first.shownIds });
    const again2 = generateCourses(demo, T1, settings, { excluded: first.shownIds });
    expect(JSON.stringify(again1)).toBe(JSON.stringify(again2));
    const ids = again1.courses.flatMap((c) => c.stops.map((s) => s.place.id));
    for (const id of first.shownIds) expect(ids).not.toContain(id);
  });

  it("대표 코스를 넣어도 테마 코스 3개 결과는 같다 (F-26 R4)", () => {
    const a = generateCourses(demo, T1, settings, { representative: false });
    const b = generateCourses(demo, T1, settings, { representative: true });
    expect(JSON.stringify(b.courses)).toBe(JSON.stringify(a.courses));
    if (b.representative) {
      const [x, y] = [at(b.representative.stops, 0).place, at(b.representative.stops, 2).place];
      expect(x.mainTheme).not.toBe(y.mainTheme);
    }
  });

  it("제외 사유는 시트 컬럼 값과 1:1", () => {
    const museum = sample.find((x) => x.id === "A0048")!; // 휠체어 불가·계단 있음·미확인
    expect(exclusionReasons(museum, T3)).toEqual(expect.arrayContaining(["X1", "X6"]));
    expect(exclusionReasons(museum, T2)).toEqual(expect.arrayContaining(["X2", "X6"]));
  });
});
