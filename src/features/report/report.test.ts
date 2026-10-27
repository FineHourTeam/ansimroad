import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/shared/data/csv";
import { parsePlaceRows } from "@/shared/data/placeSchema";
import type { PhotoRecord, TripInput } from "@/shared/domain/types";
import { generateCourses } from "@/shared/engine/generate";
import { photosBySlot } from "@/shared/engine/timeline";
import { hhmm } from "@/shared/lib/date";
import { averageRating, heroPhoto, reportShareText } from "./report";

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

describe("카카오톡 공유 글 (모담 양식 2026-10-27)", () => {
  const URL = "https://ansimroad.web.app/r/RAbCdEfGhIjK";
  const trip = { date: "2026-10-27", course, expiresOn: "2026-11-26" };

  it("머리 세 줄 · 장소마다 번호 시각 이름(+점심 · 쉬어 가기) · 사진 수 · 별점 안내 · 보는 기한 · 링크", () => {
    const text = reportShareText(trip, 4, true, URL);
    const lines = text.split("\n");
    expect(lines[0]).toBe("[안심로드] 부모님과 다녀온 목포 하루");
    expect(lines[1]).toBe(`📅 2026년 10월 27일(화) · ${course.title}`);
    expect(lines[2]).toBe(
      `🕙 ${hhmm(course.startMin)}~${hhmm(course.endMin)} · ${String(course.stops.length)}곳 · 걷는 시간 약 ${String(course.totalWalkMin)}분`,
    );
    expect(lines[3]).toBe("");
    expect(lines[4]).toBe(`① ${hhmm(stopAt(0).arriveMin)} ${stopAt(0).place.name}`);
    expect(text).toMatch(/ \(점심\)\n/);
    expect(text).toMatch(/ \(쉬어 가기\)\n/);
    expect(text).toContain(
      "\n\n📷 남긴 사진 4장 · 장소별 별점과 후기는 리포트에서 볼 수 있어요\n사진은 11월 26일까지 볼 수 있어요.\n\n▶ 여행 리포트 보기\n" +
        URL,
    );
    expect(text.endsWith(URL)).toBe(true);
  });

  it("사진 · 후기가 없으면 그 줄을 뺀다", () => {
    const none = reportShareText(trip, 0, false, URL);
    expect(none).not.toContain("📷");
    expect(none).not.toContain("별점");
    expect(none).toContain("\n\n리포트는 11월 26일까지 볼 수 있어요.\n\n▶");
    expect(reportShareText(trip, 2, false, URL)).toContain(
      "\n📷 남긴 사진 2장\n사진은 11월 26일까지",
    );
    expect(reportShareText(trip, 0, true, URL)).toContain(
      "\n⭐ 장소별 별점과 후기는 리포트에서 볼 수 있어요\n리포트는",
    );
  });

  it("보는 기한을 모르면 그 줄도 뺀다", () => {
    const text = reportShareText({ ...trip, expiresOn: "" }, 0, false, URL);
    expect(text).toContain(stopAt(course.stops.length - 1).place.name);
    expect(text).toMatch(/\n\n▶ 여행 리포트 보기\n/);
    expect(text).not.toContain("볼 수 있어요");
  });
});
