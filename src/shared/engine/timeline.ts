// 여행 당일 계산: 어르신 화면 상태(F-16), 자녀 화면 '지금쯤 ○○ 일정'(F-21·F-22), 위치 ON 시 300m 매칭.
import { minutesOfDay } from "@/shared/lib/date";
import { distanceMeters } from "@/shared/lib/geo";
import type { Course, PhotoRecord } from "@/shared/domain/types";

export const MATCH_RADIUS_M = 300;

/**
 * 촬영 시각에 예정 일정상 있을 장소의 순번 (F-21 기본).
 * 도착 예정 ≤ 시각 < 다음 장소 도착 예정. 첫 장소 도착 전이면 첫 장소, 마지막 도착 후면 마지막 장소.
 */
export function scheduledStopIndex(course: Course, minuteOfDay: number): number {
  let idx = 0;
  course.stops.forEach((s, i) => {
    if (s.arriveMin <= minuteOfDay) idx = i;
  });
  return idx;
}

export type StopState = "done" | "now" | "upcoming";

/**
 * 어르신 화면 ② 상태: 지난 장소 '완료', 지금 장소 '지금 여기', 이후는 기본.
 * 여행 당일이 아니면 모두 기본. 마지막 장소가 끝나면 모두 완료.
 */
export function seniorStates(
  course: Course,
  minuteOfDay: number,
  isTripDay: boolean,
  nowIndexOverride?: number,
): StopState[] {
  if (!isTripDay) return course.stops.map(() => "upcoming");
  const first = course.stops[0];
  const last = course.stops[course.stops.length - 1];
  if (!first || !last) return [];
  if (minuteOfDay >= last.departMin) return course.stops.map(() => "done");
  if (minuteOfDay < first.arriveMin && nowIndexOverride === undefined)
    return course.stops.map(() => "upcoming");
  const nowIdx = nowIndexOverride ?? scheduledStopIndex(course, minuteOfDay);
  return course.stops.map((_, i) => (i < nowIdx ? "done" : i === nowIdx ? "now" : "upcoming"));
}

export type LocationMatch =
  | { kind: "matched"; index: number; meters: number }
  | { kind: "outside"; nearestIndex: number; meters: number }
  | { kind: "none" };

/** 위치 ON: 코스 장소 중 반경 300m 안의 가장 가까운 곳, 없으면 '경로 밖 · N km' */
export function matchLocation(
  course: Course,
  photo: Pick<PhotoRecord, "lat" | "lng">,
): LocationMatch {
  const { lat, lng } = photo;
  if (lat === null || lng === null) return { kind: "none" };
  let best = -1;
  let bestM = Infinity;
  course.stops.forEach((s, i) => {
    const m = distanceMeters({ lat, lng }, s.place);
    if (m < bestM) {
      bestM = m;
      best = i;
    }
  });
  if (best < 0) return { kind: "none" };
  return bestM <= MATCH_RADIUS_M
    ? { kind: "matched", index: best, meters: bestM }
    : { kind: "outside", nearestIndex: best, meters: bestM };
}

/** 사진을 타임라인 칸(예정 장소 순번)에 배정한다. 위치 OFF면 시각 기준, ON이면 위치 매칭 → 실패 시 시각 기준. */
/** 자녀가 장소를 골라 올린 사진의 칸: 장소 ID 로 먼저 찾고(빼거나 넣어도 그 장소에), 옛 사진 · 뺀 장소는 순번 */
export function pickedStopIndex(course: Course, photo: PhotoRecord): number | undefined {
  if (photo.placeId !== undefined) {
    const i = course.stops.findIndex((s) => s.place.id === photo.placeId);
    if (i >= 0) return i;
  }
  return photo.stopIndex;
}

export function slotForPhoto(
  course: Course,
  photo: PhotoRecord,
  minuteOfDay: number,
  locationOn: boolean,
): number {
  const picked = pickedStopIndex(course, photo); // 자녀가 장소를 직접 골라 올린 사진
  if (picked !== undefined) return picked;
  if (locationOn) {
    const m = matchLocation(course, photo);
    if (m.kind === "matched") return m.index;
  }
  return scheduledStopIndex(course, minuteOfDay);
}

export type NowPos =
  | { kind: "before"; index: number }
  | { kind: "inside"; index: number; pct: number }
  | { kind: "after" };

/** 현재 시각이 일정의 어디쯤인지: 장소에 머무는 중이면 카드 안 비율, 이동 중이면 다음 카드 앞 */
export function nowLinePosition(course: Course, nowMin: number): NowPos {
  for (const [i, s] of course.stops.entries()) {
    if (nowMin < s.arriveMin) return { kind: "before", index: i };
    if (nowMin < s.departMin)
      return {
        kind: "inside",
        index: i,
        pct: ((nowMin - s.arriveMin) / Math.max(1, s.departMin - s.arriveMin)) * 100,
      };
  }
  return { kind: "after" };
}

/** 사진을 장소 칸별로 나눈다 (찍은 순서 유지). 코스를 고쳐 칸이 줄었으면 마지막 칸에 붙인다 */
export function photosBySlot(
  course: Course,
  photos: PhotoRecord[],
  locationOn: boolean,
): PhotoRecord[][] {
  const slots = course.stops.map((): PhotoRecord[] => []);
  const last = slots.length - 1;
  if (last < 0) return slots;
  for (const p of photos) {
    const i = Math.min(
      Math.max(0, slotForPhoto(course, p, minutesOfDay(new Date(p.takenAt)), locationOn)),
      last,
    );
    slots[i]?.push(p);
  }
  return slots;
}
