// 장소별 메모. 이 기기(localStorage)에만 저장되고, '나만 보기'를 끈 메모만 확정 때 스냅샷에 실려 어르신·가족 화면에 나간다.
import type { Course } from "@/shared/domain/types";

export interface Memo {
  text: string;
  priv: boolean;
}

const KEY = "sr.memos";

function all(): Record<string, Memo> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Memo>;
  } catch {
    return {};
  }
}

export function getMemo(placeId: string): Memo {
  return all()[placeId] ?? { text: "", priv: true };
}

export function setMemo(placeId: string, m: Memo): void {
  const data = Object.fromEntries(Object.entries(all()).filter(([k]) => k !== placeId));
  if (m.text.trim()) data[placeId] = m;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* 저장 공간이 막힌 환경에서는 메모를 남기지 못할 뿐 화면은 그대로 동작한다 */
  }
}

/** 확정할 코스에서 공유 가능한(나만 보기 OFF) 메모만 모은다 */
export function sharedMemos(course: Course): Record<string, string> {
  const data = all();
  const out: Record<string, string> = {};
  for (const p of [...course.stops.map((s) => s.place), ...(course.spare ? [course.spare] : [])]) {
    const m = data[p.id];
    if (m && !m.priv && m.text.trim()) out[p.id] = m.text.trim();
  }
  return out;
}
