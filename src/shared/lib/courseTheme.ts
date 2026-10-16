// 코스 테마 색 (모담 요청 2026-10-16): 테마 → data-course 값(tokens.css 의 --sea · --history · --nature) · 테마 라벨.
// 대표 코스 · 운영진 추천 코스처럼 테마가 없으면 undefined → 브랜드 청록.
import { THEME_COURSES } from "@/shared/engine/rules";
import type { Theme } from "@/shared/domain/types";

export type CourseTone = "sea" | "history" | "nature";

const TONE: Record<Theme, CourseTone> = { 바다: "sea", 역사문화: "history", 자연경치: "nature" };

export function courseTone(theme: Theme | null | undefined): CourseTone | undefined {
  return theme ? TONE[theme] : undefined;
}

/** '바다 코스' — 이름을 바꾼 코스에서도 테마를 글자로 함께 보여 준다 (색만으로 구분하지 않게) */
export function themeTitle(theme: Theme | null | undefined): string | null {
  return THEME_COURSES.find((t) => t.theme === theme)?.title ?? null;
}
