// E2E 공용 값 · 도우미. 날짜는 실행하는 날 기준으로 계산한다 (링크 만료 = 여행일 + 30일).
import { readFileSync } from "node:fs";
import { generateCourses } from "../../src/shared/engine/generate";
import { parseCsv } from "../../src/shared/data/csv";
import { recordsToPlaces, toRecords } from "../../src/shared/data/placeRecords";
import type { Course, Settings, TripInput } from "../../src/shared/domain/types";
import { writeDocs } from "./emulator";

export const CURATED_TITLE = "운영진 추천 · 바다 산책 코스";

/** 오늘(한국 시각) + n일 → YYYY-MM-DD */
export function ymdFromToday(n: number): string {
  const kst = new Date(Date.now() + 9 * 3600_000 + n * 86_400_000);
  return kst.toISOString().slice(0, 10);
}

/** 테스트 여행일: 일주일 뒤 */
export const TRIP_DATE = ymdFromToday(7);

/** ?now= 시연 시계 (여행일 hh:mm, 한국 시각) */
export function demoNow(date: string, hhmm: string): string {
  return `${date}T${hhmm}:00+09:00`;
}

export const INPUT: TripInput = {
  party: 2,
  age: 70,
  mobility: "none",
  walk: 20,
  date: TRIP_DATE,
  transport: "car",
};

/** S2 결과 주소 쿼리 (state/tripInput encodeQuery 와 같은 모양) */
export function resultQuery(input: TripInput = INPUT): string {
  return new URLSearchParams({
    p: String(input.party),
    a: String(input.age),
    m: input.mobility,
    w: String(input.walk),
    d: input.date,
    s: String(input.start ?? 600), // 도착 시각 (기본 오전 10시 — 앱이 주소에 늘 싣는다)
    t: input.transport,
  }).toString();
}

function demoData() {
  const records = toRecords(parseCsv(readFileSync("public/data/places.demo.csv", "utf8")));
  const settings = JSON.parse(readFileSync("public/config/settings.json", "utf8")) as Settings;
  return { places: recordsToPlaces(records).places, settings };
}

/** 엔진으로 만든 첫 번째 코스 (화면에서 보이는 코스와 같다) */
export function firstCourse(input: TripInput = INPUT): Course {
  const { places, settings } = demoData();
  const r = generateCourses(places, input, settings, {
    representative: settings.representativeCourseEnabled,
  });
  const c = r.courses[0];
  if (!c) throw new Error("테스트 입력으로 코스가 만들어지지 않아요");
  return c;
}

let seq = 0;
function token(prefix: string): string {
  seq += 1;
  const rand = Math.random()
    .toString(36)
    .slice(2, 10)
    .replace(/[^a-z0-9]/gi, "x");
  return `${prefix}${rand}${String(seq)}`.padEnd(12, "0").slice(0, 16);
}

export interface SeededTrip {
  tripId: string;
  seniorToken: string;
  familyToken: string;
  course: Course;
  input: TripInput;
}

/**
 * 확정한 여행을 에뮬레이터에 바로 넣는다 (화면 S4 · S5 · S6 테스트가 S1~S2 흐름에 기대지 않게).
 * 앱이 만드는 문서와 같은 모양: trips/{id} + links/{senior} + links/{family}
 */
export async function seedTrip(
  opts: { input?: TripInput; memos?: Record<string, string>; expired?: boolean } = {},
): Promise<SeededTrip> {
  const input = opts.input ?? INPUT;
  const course = firstCourse(input);
  const tripId = token("trip");
  const seniorToken = token("S");
  const familyToken = token("F");
  const expiresOn = opts.expired ? ymdFromToday(-1) : ymdFromToday(37);
  const expiresAt = new Date(`${expiresOn}T23:59:59+09:00`);
  await writeDocs([
    {
      path: `trips/${tripId}`,
      data: {
        ownerUid: "e2e-seed",
        createdAt: new Date().toISOString(),
        input,
        course: JSON.parse(JSON.stringify(course)) as Record<string, unknown>,
        memos: opts.memos ?? {},
        expiresOn,
        expiresAt,
      },
    },
    { path: `links/${seniorToken}`, data: { tripId, role: "senior", expiresAt } },
    { path: `links/${familyToken}`, data: { tripId, role: "family", expiresAt, seniorToken } },
  ]);
  return { tripId, seniorToken, familyToken, course, input };
}

/** 사진 업로드 테스트용 이미지 (앱이 기기에서 JPEG 로 줄여 올린다) */
export const PHOTO_FILE = "public/icons/icon-192.png";
