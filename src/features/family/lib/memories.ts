// 여행 추억 페이지 (모담 요청 2026-10-16): 장소마다 올린 사진(전부, 대표 요청 2026-10-29) · 촬영 시각 · 남긴 후기를 쓴 그대로.
// 자녀 링크로만 여는 그 가족의 페이지라 '나만 보기' 후기도 싣는다 (다른 가족에게 보이는 화면은 지금 규칙 그대로).
import type { Course, PhotoRecord, PlaceReview, Stop } from "@/shared/domain/types";
import { isoToHhmm } from "@/shared/lib/date";

export interface MemoryEntry {
  /** 코스 안 순번 (0부터) — 번호는 코스 순서 그대로 */
  index: number;
  stop: Stop;
  photos: PhotoRecord[];
  /** 첫 사진을 찍은 시각 'HH:MM' (사진이 없으면 null) */
  takenAt: string | null;
  text: string;
}

/** groups = photosBySlot 결과. 사진도 멘트도 없는 장소는 뺀다 */
export function memoryEntries(
  course: Course,
  groups: PhotoRecord[][],
  reviews: Record<string, PlaceReview>,
): MemoryEntry[] {
  return course.stops.flatMap((stop, index) => {
    const photos = groups[index] ?? [];
    const text = reviews[stop.place.id]?.text.trim() ?? "";
    if (photos.length === 0 && !text) return [];
    const first = photos[0];
    return [{ index, stop, photos, takenAt: first ? isoToHhmm(first.takenAt) : null, text }];
  });
}

/** 도장 날짜 '2026.10.18' */
export const stampDate = (ymd: string) => ymd.replaceAll("-", ".");
