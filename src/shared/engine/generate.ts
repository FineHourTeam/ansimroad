// 코스 생성 (F-04~F-07, F-11, F-12, F-26). 같은 입력 + 같은 데이터 + 같은 제외 목록 → 항상 같은 결과.
import { travelMinutes } from "@/shared/lib/geo";
import type {
  Course,
  EmergencyInfo,
  GenerateOptions,
  GenerateResult,
  Place,
  Stop,
  StopRole,
  Theme,
  TripInput,
} from "@/shared/domain/types";
import {
  exclusionReasons,
  p3Order,
  passesP5,
  rank,
  REPRESENTATIVE,
  SCHEDULE,
  score,
  THEME_COURSES,
} from "@/shared/engine/rules";

interface Context {
  attractions: Place[];
  restaurants: Place[];
  cafes: Place[];
  emergencyByRegion: Record<string, EmergencyInfo>;
  allowP3Swap: boolean;
  startMin: number; // 첫 장소 도착 시각
}

function withinHours(p: Place, arrive: number, depart: number): boolean {
  return p.openMin !== null && p.closeMin !== null && arrive >= p.openMin && depart <= p.closeMin;
}

/** P2 시각 계산. 운영시간 밖이거나 끝나는 시각(기본 16:30)을 넘기면 null. */
function schedule(
  startMin: number,
  am: Place,
  lunch: Place,
  pm: Place,
  cafe: Place,
  theme: Theme | null,
): Stop[] | null {
  const plan: [Place, StopRole, number][] = [
    [am, "am", am.stayMin ?? 0],
    [lunch, "lunch", lunch.stayMin ?? SCHEDULE.lunchDefaultStay],
    [pm, "pm", pm.stayMin ?? 0],
    [cafe, "cafe", cafe.stayMin ?? SCHEDULE.cafeDefaultStay],
  ];
  const stops: Stop[] = [];
  let clock = startMin;
  let prev: Place | null = null;
  for (const [place, role, stay] of plan) {
    const travel = prev ? travelMinutes(prev, place) : 0;
    let arrive = clock + travel;
    let wait = 0;
    if (role === "lunch" && arrive < SCHEDULE.lunchMin) {
      wait = SCHEDULE.lunchMin - arrive; // 오전이 일찍 끝나면 11:30까지 대기
      arrive = SCHEDULE.lunchMin;
    }
    const depart = arrive + stay;
    if (!withinHours(place, arrive, depart)) return null;
    const isAttraction = role === "am" || role === "pm";
    stops.push({
      role,
      place,
      arriveMin: arrive,
      departMin: depart,
      stayMin: stay,
      travelMin: travel,
      waitMin: wait,
      fallback: isAttraction && theme !== null && place.mainTheme !== theme,
    });
    clock = depart;
    prev = place;
  }
  // P2 16:30 이전 종료. 10:00 보다 늦게 도착하면 하루 길이(6시간 30분)를 같게 두고 끝나는 시각도 그만큼 늦춘다
  const endBy = Math.max(SCHEDULE.endByMin, startMin + SCHEDULE.endByMin - SCHEDULE.startMin);
  if (clock > endBy) return null;
  return stops;
}

/** 오전·오후 관광지가 정해졌을 때 점심(P4·P5·P7)과 카페(P4·P5)를 붙여 본다. */
function fillMealAndCafe(
  ctx: Context,
  am: Place,
  pm: Place,
  usedLunch: Set<string>,
  theme: Theme | null,
): Stop[] | null {
  const lunches = rank(
    ctx.restaurants.filter((r) => r.region === am.region && !usedLunch.has(r.id)),
    null,
  );
  const regions = new Set([am.region, pm.region]);
  const cafes = ctx.cafes
    .filter((c) => regions.size < 2 || regions.has(c.region))
    .sort(
      (a, b) =>
        score(b, null) - score(a, null) ||
        travelMinutes(pm, a) - travelMinutes(pm, b) ||
        (a.id < b.id ? -1 : 1),
    );
  for (const lunch of lunches) {
    for (const cafe of cafes) {
      const stops = schedule(ctx.startMin, am, lunch, pm, cafe, theme);
      if (stops) return stops;
    }
  }
  return null;
}

function orders(ctx: Context, first: Place, second: Place): [Place, Place][] {
  const p3 = p3Order(first, second);
  return ctx.allowP3Swap ? [p3, [p3[1], p3[0]]] : [p3];
}

function overlapOk(pair: Place[], courses: Course[]): boolean {
  return courses.every((c) => {
    const ids = new Set(
      c.stops.filter((s) => s.role === "am" || s.role === "pm").map((s) => s.place.id),
    );
    return pair.filter((p) => ids.has(p.id)).length <= 1; // P7: 관광지 중복 최대 1곳
  });
}

function assemble(
  ctx: Context,
  key: Course["key"],
  theme: Theme | null,
  title: string,
  stops: Stop[],
  spare: Place | null,
): Course {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) throw new Error("assemble: 장소가 없는 코스");
  const am = first.place;
  return {
    key,
    theme,
    title,
    stops,
    spare,
    startMin: first.arriveMin,
    endMin: last.departMin,
    totalWalkMin: stops.reduce((sum, s) => sum + (s.place.walkMin ?? 0), 0),
    regions: [...new Set(stops.map((s) => s.place.region))],
    er: am.er ?? ctx.emergencyByRegion[am.region] ?? null, // P8: 오전 관광지의 시트 값
    pharmacy: am.pharmacy,
    fallbackBadge: stops.some((s) => s.fallback),
  };
}

function buildThemeCourse(
  ctx: Context,
  def: (typeof THEME_COURSES)[number],
  done: Course[],
  usedLunch: Set<string>,
  fallbackOnInfeasible: boolean,
): Course | null {
  const T = def.theme;
  const primary = rank(
    ctx.attractions.filter((a) => a.mainTheme === T),
    T,
  );
  // 폴백 순서: 부테마 일치 → 타 테마 편안함 '상' (A.4)
  const fallbackPool = [
    ...rank(
      ctx.attractions.filter((a) => a.mainTheme !== T && a.subTheme === T),
      T,
    ),
    ...rank(
      ctx.attractions.filter((a) => a.mainTheme !== T && a.subTheme !== T && a.comfort === "상"),
      T,
    ),
  ];
  const primaryIds = new Set(primary.map((p) => p.id));

  // 1단계: 테마 장소끼리만. 2단계: 폴백 후보 포함 (테마 장소가 있으면 1곳 이상은 반드시 포함).
  const tiers: Place[][] = [];
  if (primary.length >= 2) {
    tiers.push(primary);
    if (fallbackOnInfeasible) tiers.push([...primary, ...fallbackPool]);
  } else {
    tiers.push([...primary, ...fallbackPool]);
  }

  for (const [tierIdx, list] of tiers.entries()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (!a || !b) continue;
        const primaryCount = Number(primaryIds.has(a.id)) + Number(primaryIds.has(b.id));
        if (tierIdx > 0 && primaryCount === 2) continue; // 1단계에서 이미 본 조합
        if (primary.length > 0 && primaryCount === 0) continue;
        if (!overlapOk([a, b], done)) continue;
        for (const [am, pm] of orders(ctx, a, b)) {
          const stops = fillMealAndCafe(ctx, am, pm, usedLunch, T);
          if (!stops) continue;
          const chosen = new Set([am.id, pm.id]);
          // P1 '여유가 있으면': 선택된 2곳을 뺀 최고 점수 관광지 (F-26 R3 과 같은 해석)
          const spare =
            [...primary, ...fallbackPool].find((p) => !chosen.has(p.id)) ??
            rank(ctx.attractions, T).find((p) => !chosen.has(p.id)) ??
            null;
          return assemble(ctx, def.key, T, def.title, stops, spare);
        }
      }
    }
  }
  return null;
}

/** 코스의 점심 식당 ID (관광지 → 점심 → 관광지 → 카페 순서라 두 번째) */
function lunchId(c: Course): string {
  return c.stops.find((s) => s.role === "lunch")?.place.id ?? "";
}

/** F-26 목포 대표 코스 (부록 A.7 R1~R6). 테마 코스를 모두 만든 뒤 마지막에 만든다. */
function buildRepresentative(ctx: Context, themeCourses: Course[]): Course | null {
  if (themeCourses.length <= 1) return null; // R5
  const cands = rank(
    ctx.attractions.filter((a) => a.mainTheme !== null),
    null,
  ); // R1·R2
  const usedLunch = new Set(themeCourses.map(lunchId)); // R4: 식당은 네 코스 모두 다르게
  for (let i = 0; i < cands.length; i++) {
    for (let j = i + 1; j < cands.length; j++) {
      const a = cands[i];
      const b = cands[j];
      if (!a || !b) continue;
      if (a.mainTheme === b.mainTheme) continue; // R3: 주테마가 서로 다른 2곳
      if (!overlapOk([a, b], themeCourses)) continue; // R4
      for (const [am, pm] of orders(ctx, a, b)) {
        const stops = fillMealAndCafe(ctx, am, pm, usedLunch, null);
        if (!stops) continue;
        const spare = cands.find((p) => p.id !== am.id && p.id !== pm.id) ?? null;
        return assemble(ctx, REPRESENTATIVE.key, null, REPRESENTATIVE.title, stops, spare);
      }
    }
  }
  return null;
}

export interface EngineSettings {
  emergencyByRegion: Record<string, EmergencyInfo>;
}

export function generateCourses(
  places: Place[],
  input: TripInput,
  settings: EngineSettings,
  options: GenerateOptions = {},
): GenerateResult {
  const excluded = new Set(options.excluded ?? []);
  const excludedReasons: Record<string, string[]> = {};
  const passed: Place[] = [];

  for (const p of places) {
    const reasons = exclusionReasons(p, input);
    if (excluded.has(p.id)) reasons.push("F-11");
    if ((p.type === "식당" || p.type === "카페휴식") && !passesP5(p)) reasons.push("P5");
    if (p.type === "관광지" && p.stayMin === null) reasons.push("P2"); // 체류시간이 비어 있으면 배치 불가
    if (reasons.length > 0) excludedReasons[p.id] = reasons;
    else passed.push(p);
  }

  const ctx: Context = {
    attractions: passed.filter((p) => p.type === "관광지"),
    restaurants: passed.filter((p) => p.type === "식당"),
    cafes: passed.filter((p) => p.type === "카페휴식"),
    emergencyByRegion: settings.emergencyByRegion,
    allowP3Swap: options.allowP3Swap ?? true,
    startMin: input.start ?? SCHEDULE.startMin,
  };

  const courses: Course[] = [];
  const usedLunch = new Set<string>();
  for (const def of THEME_COURSES) {
    const c = buildThemeCourse(ctx, def, courses, usedLunch, options.fallbackOnInfeasible ?? true);
    if (c) {
      courses.push(c);
      usedLunch.add(lunchId(c)); // P7: 식당은 서로 다르게
    }
  }

  const shortage = courses.length <= 1; // F-06: 1개 이하면 안내 + 팀 문의
  const representative =
    options.representative && !shortage ? buildRepresentative(ctx, courses) : null;
  const shown = shortage ? [] : [...courses, ...(representative ? [representative] : [])];
  const shownIds = [...new Set(shown.flatMap((c) => c.stops.map((s) => s.place.id)))].sort();

  return { courses: shortage ? [] : courses, representative, shortage, shownIds, excludedReasons };
}

/** 결과에서 코스 키로 찾기 (S2-1, S3) */
export function findCourse(result: GenerateResult, key: string): Course | null {
  return (
    [...result.courses, ...(result.representative ? [result.representative] : [])].find(
      (c) => c.key === key,
    ) ?? null
  );
}
