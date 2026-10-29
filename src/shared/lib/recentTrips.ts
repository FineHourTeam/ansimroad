// 최근 만든 여행 (모담 제안 2026-10-29): 자녀용 링크를 잃어버려도 같은 휴대폰 첫 화면에서 다시 열게 한다.
// 코스를 확정한 순간에만 이 기기(localStorage)에 저장한다. 서버에는 아무것도 보내지 않는다.
// 담는 것은 자녀 화면 토큰 · 여행 날짜 · 테마 이름뿐 (코스 이름 · 메모 · 부모님 링크는 넣지 않는다).
import type { Course } from "@/shared/domain/types";
import { REPRESENTATIVE, THEME_LABEL } from "@/shared/engine/rules";
import { addDays } from "./date";

export interface RecentTrip {
  /** 자녀 화면 토큰 (/f/{token}) */
  token: string;
  /** 여행 날짜 YYYY-MM-DD */
  date: string;
  /** '바다 코스' · '목포 대표 코스' · '추천 코스' */
  theme: string;
}

const KEY = "sr.recentTrips";
const MAX = 5;
/** 여행일 + 30일이 지나면 목록에서 뺀다 (링크 만료와 같은 기준) */
const KEEP_DAYS = 30;

/** 코스 → 테마 이름 (운영진 추천 코스는 코스 이름 대신 '추천 코스') */
export function themeName(course: Pick<Course, "key" | "theme">): string {
  if (course.theme) return `${THEME_LABEL[course.theme]} 코스`;
  return course.key === REPRESENTATIVE.key ? REPRESENTATIVE.title : "추천 코스";
}

function read(): RecentTrip[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is RecentTrip =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as RecentTrip).token === "string" &&
        typeof (x as RecentTrip).date === "string" &&
        typeof (x as RecentTrip).theme === "string",
    );
  } catch {
    return [];
  }
}

function write(list: RecentTrip[]): void {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch {
    /* 저장 공간이 막힌 환경(사생활 보호 모드 등)에서는 목록 없이 그대로 동작한다 */
  }
}

/** 저장 순서(최근에 확정한 것부터) 그대로, 여행일 + 30일이 지난 것은 기기에서도 지운다 */
function alive(today: string): RecentTrip[] {
  const all = read();
  const keep = all.filter((t) => addDays(t.date, KEEP_DAYS) >= today);
  if (keep.length !== all.length) write(keep);
  return keep;
}

/** 첫 화면에 보일 목록: 여행 날짜가 이른 순 */
export function recentTrips(today: string): RecentTrip[] {
  return alive(today).sort((a, b) => a.date.localeCompare(b.date));
}

/** 확정 직후 한 번 부른다. 같은 링크는 한 번만, 최근에 확정한 것부터 5개까지 */
export function rememberTrip(trip: RecentTrip, today: string): void {
  const rest = alive(today).filter((t) => t.token !== trip.token);
  write([{ token: trip.token, date: trip.date, theme: trip.theme }, ...rest].slice(0, MAX));
}
