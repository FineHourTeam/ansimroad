// 추천 코스 만들기: 화면과 떼어 낸 순수 로직 (장소 → 코스 장소, 지도 점, 저장 전 확인)
import type { MapPoint } from "@/shared/components/MapView";
import type { CuratedCourse, CuratedStop, Place, StopRole } from "@/shared/domain/types";
import { MAX_STOPS, MAX_STOPS_MESSAGE } from "@/shared/lib/courseEdit";
import { randomToken } from "@/shared/lib/token";

export const ROLES: readonly StopRole[] = ["am", "lunch", "pm", "cafe"];
export const STAY_MIN = 10;
export const STAY_MAX = 240;
export const STAY_STEP = 10;
const DEFAULT_STAY = 40;
// 장소 수 상한은 확정 화면과 같은 값을 쓴다 (shared/lib/courseEdit)
export { MAX_STOPS, MAX_STOPS_MESSAGE };

/** 지도에서 코스에 아직 안 넣은 장소(회색 점)의 id 앞머리 */
export const CAND_PREFIX = "place:";
/** 회색 점 이름 뒤에 붙는 안내 */
const CAND_HINT = " (눌러서 추가)";

export function emptyCourse(id: string): CuratedCourse {
  return { id, title: "", summary: "", stops: [], published: false, updatedAt: "" };
}

/** 장소 종류로 구분을 짐작한다: 식당 = 점심, 카페휴식 = 쉬어 가기, 나머지는 첫 장소면 오전 */
export function roleFor(type: Place["type"], index: number): StopRole {
  if (type === "식당") return "lunch";
  if (type === "카페휴식") return "cafe";
  return index === 0 ? "am" : "pm";
}

export function stopFromPlace(p: Place, index: number): CuratedStop {
  return {
    id: randomToken(6),
    placeId: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    role: roleFor(p.type, index),
    stayMin: p.stayMin ?? DEFAULT_STAY,
    desc: "",
    photos: [],
  };
}

/** 지도 빈 곳에 찍은 새 위치 (장소 데이터와 연결되지 않는다) */
export function stopAt(name: string, lat: number, lng: number, index: number): CuratedStop {
  return {
    id: randomToken(6),
    name,
    lat,
    lng,
    role: index === 0 ? "am" : "pm",
    stayMin: DEFAULT_STAY,
    desc: "",
    photos: [],
  };
}

export function stepStay(stayMin: number, delta: number): number {
  return Math.min(STAY_MAX, Math.max(STAY_MIN, stayMin + delta));
}

/** 저장하기 전에 막을 이유 (없으면 null) */
export function saveProblem(c: Pick<CuratedCourse, "title" | "stops">): string | null {
  if (!c.title.trim()) return "코스 이름을 적어 주세요";
  if (c.stops.length === 0) return "지도에서 장소를 하나 이상 골라 주세요";
  if (c.stops.length > MAX_STOPS) return MAX_STOPS_MESSAGE;
  return null;
}

/** 사진 주소는 http(s)만 받는다 (javascript: 등 차단) */
export function photoUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

export type Pin = Pick<CuratedStop, "id" | "name" | "lat" | "lng" | "placeId">;

/** 코스 장소(번호) + 아직 안 넣은 등록 장소(+) */
export function coursePoints(pins: Pin[], places: Place[]): MapPoint[] {
  const used = new Set(pins.map((s) => s.placeId));
  return [
    ...pins.map((s, i) => ({
      lat: s.lat,
      lng: s.lng,
      name: s.name,
      label: String(i + 1),
      kind: "stop" as const,
      id: s.id,
    })),
    ...places
      .filter((p) => !used.has(p.id))
      .map((p) => ({
        lat: p.lat,
        lng: p.lng,
        // 네이버 지도 말풍선 · 스크린리더에도 누르면 들어간다고 알린다
        name: p.name,
        hint: CAND_HINT,
        label: "+",
        kind: "cand" as const,
        id: `${CAND_PREFIX}${p.id}`,
      })),
  ];
}
