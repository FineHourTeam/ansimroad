import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/shared/data/csv";
import { parsePlaceRows } from "@/shared/data/placeSchema";
import type { TripInput } from "@/shared/domain/types";
import { generateCourses } from "@/shared/engine/generate";
import { monthDayWeekday, scheduleShareText, seniorShareText } from "./shareText";

const places = parsePlaceRows(
  parseCsv(readFileSync(resolve(__dirname, "../../../../public/data/places.demo.csv"), "utf8")),
).places;
const input: TripInput = {
  party: 2,
  age: 70,
  mobility: "none",
  walk: 30,
  date: "2026-10-18",
  transport: "car",
};
const generated = generateCourses(places, input, { emergencyByRegion: {} }).courses[0];
if (!generated) throw new Error("테스트 코스가 만들어지지 않아요");
const course = generated;
const URL_T = "https://ansimroad.web.app/t/AbCdEfGhIj";

describe("카카오톡 공유 글 (모담 양식)", () => {
  it("날짜는 '10월 18일(일)'", () => {
    expect(monthDayWeekday("2026-10-18")).toBe("10월 18일(일)");
  });

  it("부모님 링크 글: 머리 두 줄 · 장소마다 번호 시각 이름(+점심 · 쉬어 가기) 과 주소 한 줄 · 부모님 링크만", () => {
    const text = seniorShareText({ input, course }, URL_T);
    const lines = text.split("\n");
    expect(lines[0]).toBe(`[안심로드] 10월 18일(일) ${course.title}`);
    expect(lines[1]).toBe("여행 일정 보내 드려요.");
    expect(lines[2]).toBe("");
    const lunch = course.stops.findIndex((s) => s.role === "lunch");
    expect(text).toContain(`${String.fromCharCode(0x2460 + lunch)} `);
    expect(text).toMatch(/\(점심\)\n📍 /);
    expect(text).toMatch(/\(쉬어 가기\)\n📍 /);
    for (const s of course.stops) expect(text).toContain(`📍 ${s.place.address}`);
    expect(lines.at(-2)).toBe("📷 여행 날 아래 링크를 열고 '사진 남기기'만 눌러 주세요.");
    expect(lines.at(-1)).toBe(`👉 ${URL_T}`);
    expect(text).not.toContain("/f/");
  });

  it("주소가 빈 장소는 📍 줄을 뺀다", () => {
    const first = course.stops[0];
    if (!first) throw new Error("장소 없음");
    const noAddr = {
      ...course,
      stops: [{ ...first, place: { ...first.place, address: " " } }, ...course.stops.slice(1)],
    };
    const lines = seniorShareText({ input, course: noAddr }, URL_T).split("\n");
    expect(lines[3]).toMatch(/^① \d\d:\d\d /);
    expect(lines[4]).toMatch(/^② /);
  });

  it("일정표 글: 제목 · 시간과 걷는 시간 · 장소마다 '시각 이름 · 주소' · 사진 남기기 링크", () => {
    const lines = scheduleShareText({ input, course }, URL_T).split("\n");
    expect(lines[0]).toBe(`[안심로드] 10월 18일(일) ${course.title} 일정표예요`);
    expect(lines[1]).toMatch(/^\d\d:\d\d ~ \d\d:\d\d · 걷는 시간 약 \d+분$/);
    const first = course.stops[0];
    expect(lines[3]).toContain(` ${first?.place.name ?? "?"} · ${first?.place.address ?? "?"}`);
    expect(lines.at(-1)).toBe(`📷 여행 날 사진 남기기: ${URL_T}`);
  });

  it("부모님 링크가 없으면 마지막 줄을 뺀다", () => {
    expect(scheduleShareText({ input, course }, null)).not.toContain("사진 남기기");
  });
});
