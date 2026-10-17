// 부록 A 코스 생성 룰 v1 — 제외 룰(절대)과 점수 룰(선호)을 분리한다. 모든 룰은 시트 컬럼 하나와 1:1로 대응한다.
// 컬럼이 비어 있으면 그 룰에서는 '조건 불충족'으로 본다(보수적). 예외: 식당·카페의 어르신관람시간은 기본값(P2).
import { nthWeekdayOfMonth, weekdayOf } from "@/shared/lib/date";
import type { CourseKey, Place, Theme, TripInput } from "@/shared/domain/types";

export const SCHEDULE = {
  startMin: 10 * 60, // P2: 10:00 시작
  lunchMin: 11 * 60 + 30, // P2: 점심 11:30 고정
  endByMin: 16 * 60 + 30, // P2: 16:30 이전 종료
  lunchDefaultStay: 60, // P2: 식당 기본 60분
  cafeDefaultStay: 40, // P2: 카페 기본 40분
} as const;

export const TRANSIT_MAX_DROPOFF_M = 200; // X5

export const THEME_COURSES: { key: CourseKey; theme: Theme; title: string }[] = [
  { key: "sea", theme: "바다", title: "바다 코스" },
  { key: "history", theme: "역사문화", title: "역사·문화 코스" },
  { key: "nature", theme: "자연경치", title: "자연·경치 코스" },
];
export const REPRESENTATIVE = { key: "best" as const, title: "목포 대표 코스" };

export const THEME_LABEL: Record<Theme, string> = {
  바다: "바다",
  역사문화: "역사·문화",
  자연경치: "자연·경치",
};

/** X4: 여행 날짜가 휴무요일에 해당하는지 */
export function isClosedOn(place: Place, ymd: string): boolean {
  const wd = weekdayOf(ymd);
  const nth = nthWeekdayOfMonth(ymd);
  return place.closed.some((r) => r.weekday === wd && (r.nth === null || r.nth.includes(nth)));
}

/** A.3 제외 룰 X1~X7. 걸린 룰 ID 목록을 돌려준다 (빈 배열 = 통과). */
export function exclusionReasons(p: Place, input: TripInput): string[] {
  const out: string[] = [];
  if (input.mobility === "wheelchair" && (p.wheelchair === null || p.wheelchair === "불가"))
    out.push("X1");
  if (input.mobility === "stairs" && (p.stairs === null || p.stairs === "있음")) out.push("X2");
  if (p.walkMin === null || (input.walk !== 30 && p.walkMin > input.walk)) out.push("X3");
  // 칸이 비었으면 휴무를 모르는 것 → 조건 불충족 ('없음'이라고 적어야 통과)
  if (p.closedRaw.trim() === "" || isClosedOn(p, input.date)) out.push("X4");
  if (input.transport === "transit" && (p.dropoffM === null || p.dropoffM > TRANSIT_MAX_DROPOFF_M))
    out.push("X5");
  if (input.mobility !== "none" && p.verify === "미확인") out.push("X6");
  if (p.toilet === null || p.toilet === "없음") out.push("X7");
  return out;
}

/** P5: 식당·카페는 입식테이블 '있음' 그리고 층/엘리베이터 ∈ {1층, 상층EV있음} */
export function passesP5(p: Place): boolean {
  return p.standingTable === "있음" && (p.floor === "1층" || p.floor === "상층EV있음");
}

const VERIFY_POINTS = { 현장: 3, 전화: 2, 미확인: 0 } as const;
const COMFORT_POINTS = { 상: 2, 중: 1, 하: 0 } as const;

/** P6 점수. theme 이 null 이면 '주테마 일치 2'를 뺀다 (식당·카페, F-26 R2). */
export function score(p: Place, theme: Theme | null): number {
  return (
    VERIFY_POINTS[p.verify] +
    COMFORT_POINTS[p.comfort] +
    (theme !== null && p.mainTheme === theme ? 2 : 0)
  );
}

/** 점수 내림차순, 동점은 ID 오름차순 (P6) */
export function rank(list: Place[], theme: Theme | null): Place[] {
  return [...list].sort(
    (a, b) => score(b, theme) - score(a, theme) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** P3 오후 선호도: 실내·편안함 '상'일수록 오후로 */
function afternoonPreference(p: Place): number {
  return (p.indoor === "실내" ? 1 : 0) + (p.comfort === "상" ? 1 : 0);
}

/**
 * P3: 필수보행이 긴 관광지를 오전, 실내·편안함 '상'을 오후.
 * 둘 다 같으면 점수 순서가 앞선 장소(first)를 오전에 둔다.
 */
export function p3Order(first: Place, second: Place): [Place, Place] {
  const wa = first.walkMin ?? 0;
  const wb = second.walkMin ?? 0;
  if (wa !== wb) return wa > wb ? [first, second] : [second, first];
  const pa = afternoonPreference(first);
  const pb = afternoonPreference(second);
  if (pa !== pb) return pa < pb ? [first, second] : [second, first];
  return [first, second];
}
