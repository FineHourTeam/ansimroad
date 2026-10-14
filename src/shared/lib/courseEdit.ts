// 확정한 코스 수정: 장소 빼기 · 순서 바꾸기 · 머무는 시간 조정 · 장소 넣기. 바꾼 뒤 시간표(도착·출발·이동)를 앞에서부터 다시 계산한다.
// 점심 11:30 고정은 수정 후에는 적용하지 않는다 (직접 조정이므로 시간이 순서대로 이어진다).
import type { Course, Place, Stop, StopRole } from "@/shared/domain/types";
import { distanceMeters, travelMinutes } from "@/shared/lib/geo";

export function rebuild(
  course: Course,
  places: { place: Place; role: StopRole; stayMin: number }[],
): Course {
  let t = course.startMin;
  const stops: Stop[] = places.map((p, i) => {
    const prev = places[i - 1];
    const travelMin = prev ? travelMinutes(prev.place, p.place) : 0;
    const arriveMin = i === 0 ? course.startMin : t + travelMin;
    t = arriveMin + p.stayMin;
    return {
      role: p.role,
      place: p.place,
      arriveMin,
      departMin: t,
      stayMin: p.stayMin,
      travelMin,
      waitMin: 0,
      fallback: false,
    };
  });
  return {
    ...course,
    stops,
    endMin: t,
    totalWalkMin: stops.reduce((sum, s) => sum + (s.place.walkMin ?? 0), 0),
  };
}

const base = (c: Course) =>
  c.stops.map((s) => ({ place: s.place, role: s.role, stayMin: s.stayMin }));

export function removeStop(course: Course, index: number): Course {
  if (course.stops.length <= 1) return course;
  return rebuild(
    course,
    base(course).filter((_, i) => i !== index),
  );
}

/** 순서 바꾸기: dir = -1 이면 한 칸 앞으로, 1 이면 한 칸 뒤로 (끝에서는 그대로) */
export function moveStop(course: Course, index: number, dir: -1 | 1): Course {
  const list = base(course);
  const to = index + dir;
  const a = list[index];
  const b = list[to];
  if (!a || !b) return course;
  list[index] = b;
  list[to] = a;
  return rebuild(course, list);
}

export function changeStay(course: Course, index: number, deltaMin: number): Course {
  return rebuild(
    course,
    base(course).map((s, i) =>
      i === index ? { ...s, stayMin: Math.min(180, Math.max(10, s.stayMin + deltaMin)) } : s,
    ),
  );
}

/** 코스 이름 바꾸기 (빈 이름은 받지 않는다) */
export function renameCourse(course: Course, title: string): Course {
  const t = title.trim().slice(0, 30);
  return t ? { ...course, title: t } : course;
}

/** 한 코스에 넣을 수 있는 장소 수 — firestore.rules validCourse() 가 10곳 넘는 코스를 막는다 */
export const MAX_STOPS = 10;
export const MAX_STOPS_MESSAGE = `장소는 ${String(MAX_STOPS)}곳까지 넣을 수 있어요`;

/** 출발 시각을 앞뒤로 옮긴다 (뒤 일정이 모두 같이 움직인다) */
export function shiftStart(course: Course, deltaMin: number): Course {
  return rebuild(
    { ...course, startMin: Math.min(16 * 60, Math.max(7 * 60, course.startMin + deltaMin)) },
    base(course),
  );
}

/** 가장 가까운 장소 바로 뒤에 넣는다 */
export function addPlace(course: Course, place: Place): Course {
  const list = base(course);
  let near = 0;
  let nearM = Infinity;
  course.stops.forEach((s, i) => {
    const m = distanceMeters(s.place, place);
    if (m < nearM) {
      near = i;
      nearM = m;
    }
  });
  const role: StopRole =
    place.type === "식당" ? "lunch" : place.type === "카페휴식" ? "cafe" : "pm";
  list.splice(near + 1, 0, { place, role, stayMin: place.stayMin ?? 40 });
  const next = rebuild(course, list);
  return course.spare?.id === place.id ? { ...next, spare: null } : next;
}
