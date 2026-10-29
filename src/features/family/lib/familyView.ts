// 자녀 화면(S5) 계산: 예정 시각 지남 · 현황 배너 문구 · 사진 위치 줄 (F-21 · F-22)
import type { Course, PhotoRecord } from "@/shared/domain/types";
import { matchLocation, pickedStopIndex, scheduledStopIndex } from "@/shared/engine/timeline";
import { diffDays, hhmm, isoToHhmm, koreanMonthDay, minutesOfDay } from "@/shared/lib/date";

export const photoMin = (p: PhotoRecord) => minutesOfDay(new Date(p.takenAt));

const stopName = (course: Course, i: number) => course.stops[i]?.place.name ?? "";

/** 예정 시각이 지났는지 (여행 전이면 모두 아직, 지난 날이면 모두 지남) */
export function isPast(today: string, date: string, min: number, nowMin: number): boolean {
  if (today !== date) return today > date;
  return min <= nowMin;
}

export interface BannerText {
  tone: "ok" | "calm";
  main: string;
  sub: string;
}

/** ② 현황 배너. 불안을 주지 않도록 경고 색은 쓰지 않는다 */
export function bannerText(a: {
  course: Course;
  date: string;
  expiresOn: string;
  photos: PhotoRecord[];
  locationOn: boolean;
  today: string;
  nowMin: number;
  /** 일정보다 일찍 '여행 완료'를 눌렀어도 끝난 여행으로 */
  completed: boolean;
}): BannerText {
  const { course, date, photos, today, nowMin } = a;
  const count = String(photos.length);
  if (a.completed || today > date || (today === date && nowMin >= course.endMin)) {
    return {
      tone: "calm",
      main: `여행이 끝났어요 · 사진 ${count}장`,
      sub: `사진을 볼 수 있는 마지막 날 · ${koreanMonthDay(a.expiresOn)}`,
    };
  }
  // 여행 전: 늦은 것처럼 들리지 않게 앞을 보는 말로 (전날 미리 온 사진이 있어도)
  if (today < date) {
    const days = diffDays(date, today);
    return {
      tone: "calm",
      main: days === 1 ? "내일이 여행 날이에요" : `여행까지 ${String(days)}일 남았어요`,
      sub: `${hhmm(course.startMin)} 출발 · 부모님께 링크를 보내 두세요`,
    };
  }
  const last = photos[photos.length - 1];
  if (!last) {
    if (nowMin >= course.startMin) {
      return {
        tone: "calm",
        main: `지금쯤 ${stopName(course, scheduledStopIndex(course, nowMin))} 일정`,
        sub: "아직 사진은 없어요",
      };
    }
    return {
      tone: "calm",
      main: "아직 첫 사진이 오지 않았어요",
      sub: `${hhmm(course.startMin)} 출발 예정`,
    };
  }
  const time = isoToHhmm(last.takenAt);
  const planned = scheduledStopIndex(course, photoMin(last));
  const m = a.locationOn ? matchLocation(course, last) : ({ kind: "none" } as const);
  if (m.kind === "none") {
    return {
      tone: "ok",
      main: `지금쯤 ${stopName(course, planned)} 일정`,
      sub: `${time} 마지막 사진`,
    };
  }
  // 위치 ON: 300m 안이면 매칭 장소, 밖이면 가장 가까운 코스 장소
  const idx = m.kind === "matched" ? m.index : m.nearestIndex;
  return {
    tone: "ok",
    main: `지금 ${stopName(course, idx)} 근처`,
    sub: `${time} 마지막 사진 · ${idx >= planned ? "예정대로 진행 중이에요" : "예정보다 여유 있게 다니고 있어요"}`,
  };
}

export type PhotoWhere =
  | { kind: "picked"; name: string }
  | { kind: "scheduled"; name: string }
  | { kind: "matched"; name: string; address: string }
  | { kind: "outside"; name: string; meters: number }
  | { kind: "none" };

/** ④ 사진 카드의 위치 줄: 자녀가 고른 칸이 먼저, 위치 OFF면 찍은 시각의 예정 장소, ON이면 300m 매칭 결과 */
export function photoWhere(course: Course, photo: PhotoRecord, locationOn: boolean): PhotoWhere {
  const picked = pickedStopIndex(course, photo);
  if (picked !== undefined) {
    const last = Math.max(0, course.stops.length - 1);
    return { kind: "picked", name: stopName(course, Math.min(Math.max(0, picked), last)) };
  }
  if (!locationOn) {
    return {
      kind: "scheduled",
      name: stopName(course, scheduledStopIndex(course, photoMin(photo))),
    };
  }
  const m = matchLocation(course, photo);
  if (m.kind === "matched") {
    const place = course.stops[m.index]?.place;
    return { kind: "matched", name: place?.name ?? "", address: place?.address ?? "" };
  }
  if (m.kind === "outside") {
    return {
      kind: "outside",
      name: stopName(course, m.nearestIndex),
      meters: Math.round(m.meters),
    };
  }
  return { kind: "none" };
}
