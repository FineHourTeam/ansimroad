// 리포트 계산: 공개 후기 평균 별점 · 히어로 사진 · 카카오톡 공유 글. (사진 묶기는 @/shared/engine/timeline 의 photosBySlot)
import type { Course, PhotoRecord, PlaceReview, ReportSnapshot } from "@/shared/domain/types";
import { hhmm, isValidYmd, koreanDateWeekday, koreanMonthDay } from "@/shared/lib/date";
import { circled, ROLE_NOTE } from "@/shared/lib/placeFacts";

/**
 * 카카오톡으로 보내는 리포트 글 (모담 양식 2026-10-27). 사진 · 후기가 없으면 그 줄을 빼고, 보는 기한은 리포트 화면의 날짜와 같다.
 * 링크는 글 맨 끝에 — 부모님 링크 글과 같은 방식 (카카오톡이 글 속 주소로 미리보기 카드를 만든다)
 */
export function reportShareText(
  trip: Pick<ReportSnapshot, "date" | "course" | "expiresOn">,
  photoCount: number,
  hasReviews: boolean,
  url: string,
): string {
  const { course } = trip;
  const kept = [
    photoCount > 0 ? `📷 남긴 사진 ${String(photoCount)}장` : null,
    hasReviews ? "장소별 별점과 후기는 리포트에서 볼 수 있어요" : null,
  ].filter((s): s is string => s !== null);
  const summary = kept.length > 0 ? [`${photoCount > 0 ? "" : "⭐ "}${kept.join(" · ")}`] : [];
  const until = isValidYmd(trip.expiresOn)
    ? [
        `${photoCount > 0 ? "사진은" : "리포트는"} ${koreanMonthDay(trip.expiresOn)}까지 볼 수 있어요.`,
      ]
    : [];
  return [
    "[안심로드] 부모님과 다녀온 목포 하루",
    `📅 ${koreanDateWeekday(trip.date)} · ${course.title}`,
    `🕙 ${hhmm(course.startMin)}~${hhmm(course.endMin)} · ${String(course.stops.length)}곳 · 걷는 시간 약 ${String(course.totalWalkMin)}분`,
    "",
    ...course.stops.map(
      (s, i) => `${circled(i)} ${hhmm(s.arriveMin)} ${s.place.name}${ROLE_NOTE[s.role] ?? ""}`,
    ),
    ...(summary.length + until.length > 0 ? ["", ...summary, ...until] : []),
    "",
    "▶ 여행 리포트 보기",
    url,
  ].join("\n");
}

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
