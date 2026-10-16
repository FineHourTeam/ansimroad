// S1 조건 항목 제목 (④~⑨) — 미입력 안내 문구에도 쓴다. 입력하는 자녀가 '여행하실 분'의 조건을 고르는 관점 (모담 확정 문구 2026-10-16)
import type { TripInput } from "@/shared/domain/types";

export type FieldKey = keyof TripInput;

export const FIELD_TITLES: Record<FieldKey, string> = {
  party: "여행하실 분은 몇 분인가요?",
  age: "여행하실 분의 연세는요?",
  mobility: "걸으실 때 어려운 점이 있으신가요?",
  walk: "쉬지 않고 걸으실 수 있는 시간은요?",
  date: "언제 여행하시나요?",
  start: "목포에 몇 시쯤 도착하시나요?",
  transport: "목포에서는 무엇으로 이동하시나요?",
};

/** 버튼 위 '남은 항목' 줄에 쓰는 짧은 이름 (도착 시각은 기본값이 있어 빠지지 않는다) */
export const FIELD_SHORT: Record<FieldKey, string> = {
  party: "인원",
  age: "연세",
  mobility: "걷기 어려운 점",
  walk: "걷는 시간",
  date: "여행 날짜",
  start: "도착 시각",
  transport: "이동 수단",
};
