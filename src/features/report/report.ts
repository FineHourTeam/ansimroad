// 리포트 계산: 공개 후기 평균 별점 · 히어로 사진을 고른다. (사진 묶기는 @/shared/engine/timeline 의 photosBySlot)
import type { Course, PhotoRecord, PlaceReview } from "@/shared/domain/types";

/** 공개 후기의 평균 별점 (없으면 null). 나만 보기 후기는 빼고 센다 */
export function averageRating(reviews: Record<string, PlaceReview>): number | null {
  const pub = Object.values(reviews).filter((r) => !r.priv);
  if (pub.length === 0) return null;
  return pub.reduce((sum, r) => sum + r.rating, 0) / pub.length;
}

/**
 * 히어로 사진: 공개 별점이 가장 높은 장소의 첫 사진. 별점이 같거나 없으면 앞 장소. 사진이 하나도 없으면 null.
 * groups 는 photosBySlot 결과 (장소 순서대로 묶인 사진).
 */
export function heroPhoto(
  course: Course,
  groups: PhotoRecord[][],
  reviews: Record<string, PlaceReview>,
): PhotoRecord | null {
  let best: PhotoRecord | null = null;
  let bestScore = -1;
  for (const [i, s] of course.stops.entries()) {
    const p = groups[i]?.[0];
    if (!p) continue;
    const r = reviews[s.place.id];
    const score = r && !r.priv ? r.rating : 0;
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}
