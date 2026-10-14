// S1 조건 항목 제목 (④~⑨) — 미입력 안내 문구에도 쓴다
import type { TripInput } from "@/shared/domain/types";

export type FieldKey = keyof TripInput;

export const FIELD_TITLES: Record<FieldKey, string> = {
  party: "누구와 가시나요?",
  age: "연세가 어떻게 되세요?",
  mobility: "걷는 데 어려움이 있으신가요?",
  walk: "한 번에 얼마나 걸으실 수 있나요?",
  date: "언제 가시나요?",
  start: "몇 시에 도착하시나요?",
  transport: "어떻게 이동하세요?",
};
