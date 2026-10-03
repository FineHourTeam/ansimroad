// 리포트 계산: 공개 후기 평균 별점을 낸다. (사진 묶기는 @/shared/engine/timeline 의 photosBySlot)
import type { PlaceReview } from "@/shared/domain/types";

/** 공개 후기의 평균 별점 (없으면 null). 나만 보기 후기는 빼고 센다 */
export function averageRating(reviews: Record<string, PlaceReview>): number | null {
  const pub = Object.values(reviews).filter((r) => !r.priv);
  if (pub.length === 0) return null;
  return pub.reduce((sum, r) => sum + r.rating, 0) / pub.length;
}
