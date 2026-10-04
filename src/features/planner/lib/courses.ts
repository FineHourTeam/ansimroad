// 코스 화면(S2 · S2-1)이 쓰는 작은 순수 함수
import { findCourse } from "@/shared/engine/generate";
import type { Course, GenerateResult, PublicReview } from "@/shared/domain/types";

/** '목포 해상케이블카 → 점심(뜰채) → 목포평화광장 → 커피창고로' */
export function routeLine(c: Course): string {
  return c.stops
    .map((s) => (s.role === "lunch" ? `점심(${s.place.name})` : s.place.name))
    .join(" → ");
}

/** 주소의 코스 키로 찾기: 엔진이 만든 코스 → 없으면 운영진 추천 코스(c-{id}) */
export function pickCourse(result: GenerateResult, curated: Course[], key: string): Course | null {
  return findCourse(result, key) ?? curated.find((c) => c.key === key) ?? null;
}

/** 공개 후기 평균 별점 (소수 첫째 자리 문자열). 후기가 없으면 null */
export function averageRating(list: PublicReview[]): string | null {
  if (list.length === 0) return null;
  return (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1);
}
