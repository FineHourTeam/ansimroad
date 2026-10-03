// 어르신 화면(S4) 계산: 제목 · 여행일과의 거리 · 오늘 보낸 사진 수 · 사진에 붙일 위치 · 보내기 시간 제한
import type { ConsentChoice, NewPhoto, PhotoRecord, TripSnapshot } from "@/shared/domain/types";
import { diffDays, koreanMonthDay, toLocalYmd } from "@/shared/lib/date";
import { getPosition } from "@/shared/lib/location";

/** ① 제목: '10월 18일 바다 코스' */
export function tripTitle(trip: Pick<TripSnapshot, "input" | "course">): string {
  return `${koreanMonthDay(trip.input.date)} ${trip.course.title}`;
}

/** 오늘(기기 시각)이 여행일에서 며칠 떨어졌는지. 0 = 여행 당일, 음수 = 여행 전 */
export function dayGapOf(current: Date, tripDate: string): number {
  return diffDays(toLocalYmd(current), tripDate);
}

/** 사진 남기기는 여행일 ±1일 (기기 시간대 오차 대비) */
export function canShootOn(dayGap: number): boolean {
  return Math.abs(dayGap) <= 1;
}

/** 여행 당일이 아닐 때 제목 아래 안내 한 줄 (당일이면 null) */
export function dayNotice(dayGap: number): string | null {
  if (dayGap === -1) return "내일이 여행 날이에요";
  if (dayGap < 0) return `여행까지 ${String(-dayGap)}일 남았어요`;
  // 다음날은 사진 남기기가 아직 열려 있으니 '지난 여행'이라 하지 않는다
  if (dayGap === 1) return "어제가 여행 날이었어요";
  if (dayGap > 0) return "지난 여행이에요";
  return null;
}

/** 어르신이 오늘 보낸 사진 수 (찍은 시각 기준, 자녀가 올린 사진은 빼고) */
export function countSentToday(photos: PhotoRecord[], todayYmd: string): number {
  return photos.filter((p) => {
    if (p.by !== "senior") return false;
    const at = new Date(p.takenAt);
    return !Number.isNaN(at.getTime()) && toLocalYmd(at) === todayYmd;
  }).length;
}

export { erDisplayName } from "@/shared/lib/format";

/** 보유 기간(여행일 + N일). 만료일을 못 읽으면 설정값 */
export function keepDaysOf(
  trip: Pick<TripSnapshot, "expiresOn" | "input">,
  fallback: number,
): number {
  const days = diffDays(trip.expiresOn, trip.input.date);
  return Number.isFinite(days) && days > 0 ? days : fallback;
}

export type LocationPart = Pick<NewPhoto, "lat" | "lng" | "locationStatus">;

/** 위치(F-17·F-18·F-24): 설정 OFF면 위치 권한을 아예 묻지 않는다. '위치 없이 시작'이면 묻지 않는다. */
export async function locate(locationOn: boolean, consent: ConsentChoice): Promise<LocationPart> {
  if (!locationOn) return { lat: null, lng: null, locationStatus: "off" };
  if (consent !== "agree") return { lat: null, lng: null, locationStatus: "skipped" };
  const p = await getPosition(); // 한 번 거부되면 location.ts 가 기억해 다시 묻지 않는다
  return p.ok
    ? { lat: p.lat, lng: p.lng, locationStatus: "ok" }
    : { lat: null, lng: null, locationStatus: "denied" };
}

/** ms 안에 끝나지 않으면 실패로 본다. 끝나면 타이머를 지운다 */
export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let id: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    id = setTimeout(() => {
      reject(new Error("timeout"));
    }, ms);
  });
  return Promise.race([work, timeout]).finally(() => {
    clearTimeout(id);
  });
}
