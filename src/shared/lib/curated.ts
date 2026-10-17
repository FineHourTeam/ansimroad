// 운영진 추천 코스 → 화면 · 확정 흐름에서 쓰는 코스(Course).
// 장소 데이터에 있는 곳은 접근성 정보 · 응급실을 그대로 쓰고, 운영진이 고친 이름 · 사진 · 설명 · 머무는 시간을 덮어쓴다.
// 지도에서 새로 찍은 곳은 정보가 비어 있는 장소로 만든다 (확인상태 '미확인' — 확인 배지를 붙이지 않는다).
import type {
  Course,
  CuratedCourse,
  CuratedStop,
  EmergencyInfo,
  Place,
  PlaceType,
  TripInput,
} from "@/shared/domain/types";
import { exclusionReasons, isClosedOn } from "@/shared/engine/rules";
import { rebuild } from "@/shared/lib/courseEdit";
import { addDays } from "@/shared/lib/date";

const TYPE_BY_ROLE: Record<CuratedStop["role"], PlaceType> = {
  am: "관광지",
  pm: "관광지",
  lunch: "식당",
  cafe: "카페휴식",
};

function blankPlace(stop: CuratedStop): Place {
  return {
    id: `custom-${stop.id}`,
    name: stop.name,
    type: TYPE_BY_ROLE[stop.role],
    area: "목포",
    region: "",
    mainTheme: null,
    subTheme: null,
    address: "",
    phoneRaw: "",
    phones: [],
    lat: stop.lat,
    lng: stop.lng,
    wheelchair: null,
    stairs: null,
    walkMin: null,
    stayMin: stop.stayMin,
    indoor: null,
    benches: null,
    comfort: "중",
    toilet: null,
    accessibleToilet: null,
    dropoffM: null,
    parking: null,
    closedRaw: "",
    closed: [],
    hoursRaw: "",
    openMin: null,
    closeMin: null,
    standingTable: null,
    floor: null,
    er: null,
    pharmacy: null,
    verify: "미확인",
    verifiedAt: "",
    verifiedBy: "",
    photoUrl: null,
    photoUrls: [],
    note: "",
  };
}

export function curatedPlace(stop: CuratedStop, places: Place[]): Place {
  const found = stop.placeId ? places.find((p) => p.id === stop.placeId) : undefined;
  const base = found ?? blankPlace(stop);
  const photos = stop.photos.length > 0 ? stop.photos : base.photoUrls;
  return {
    ...base,
    name: stop.name || base.name,
    desc: stop.desc,
    photoUrls: photos,
    photoUrl: photos[0] ?? null,
  };
}

/**
 * 운영진 추천 코스도 이동조건(X1 · X2 · X6)과 여행 날짜 휴무(X4)는 지킨다.
 * 지도에서 찍은 장소는 칸이 비어 있어서, 빈 휴무 칸은 막지 않고 이동조건의 빈 칸만 보수적으로 막는다.
 */
export function curatedFits(course: Course, input: TripInput): boolean {
  return course.stops.every(
    ({ place }) =>
      !isClosedOn(place, input.date) &&
      !exclusionReasons(place, input).some((r) => r === "X1" || r === "X2" || r === "X6"),
  );
}

/** from 부터 2주 안에서 코스 장소가 모두 여는 첫날 (운영진 '사용자 화면에서 보기' — 쉬는 날이면 S2 가 추천 코스를 뺀다) */
export function firstOpenDate(course: Course | null, from: string): string {
  for (let i = 0; i < 14; i++) {
    const d = addDays(from, i);
    if (!course || course.stops.every((s) => !isClosedOn(s.place, d))) return d;
  }
  return from;
}

export function curatedToCourse(
  c: CuratedCourse,
  places: Place[],
  startMin = 10 * 60,
  emergencyByRegion: Record<string, EmergencyInfo> = {},
): Course {
  const ps = c.stops.map((s) => curatedPlace(s, places));
  const withEr = ps.find((p) => p.er);
  // P8: 장소 데이터에 응급실이 없으면 첫 권역의 응급실(설정값). 권역을 모르는 새 장소뿐이면 비운다
  const region = ps.find((p) => p.region)?.region;
  const er = withEr?.er ?? (region ? emergencyByRegion[region] : undefined) ?? null;
  const template: Course = {
    key: `c-${c.id}`,
    theme: null,
    title: c.title || "이름 없는 코스",
    stops: [],
    spare: null,
    startMin,
    endMin: startMin,
    totalWalkMin: 0,
    regions: [...new Set(ps.map((p) => p.region).filter(Boolean))],
    er,
    pharmacy: withEr?.pharmacy ?? null,
    fallbackBadge: false,
    summary: c.summary.trim() === "" ? undefined : c.summary, // 비어 있으면 카드 설명 없음
  };
  return rebuild(
    template,
    c.stops.map((s) => ({ place: curatedPlace(s, places), role: s.role, stayMin: s.stayMin })),
  );
}
