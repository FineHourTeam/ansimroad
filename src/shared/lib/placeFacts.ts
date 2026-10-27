// S2-1 ③ 정보 줄: 걷는 시간 · 계단 · 휠체어 · 화장실 · 벤치 · 택시 하차 후 거리.
// 값이 없거나 보여 줄 값이 아닌 항목은 줄에서 뺀다 (F-08 '값 없는 항목은 줄 숨김').
import type { Place, VerifyStatus } from "@/shared/domain/types";

export interface Fact {
  key: string;
  label: string;
  value: string;
}

export function placeFacts(p: Place): Fact[] {
  const out: Fact[] = [];
  if (p.walkMin !== null)
    out.push({ key: "walk", label: "걷는 시간", value: `${String(p.walkMin)}분` });
  if (p.stairs === "없음" || p.stairs === "우회가능")
    out.push({
      key: "stairs",
      label: "계단",
      value: p.stairs === "없음" ? "없음" : "돌아가는 길 있음",
    });
  if (p.wheelchair === "가능" || p.wheelchair === "일부")
    out.push({ key: "wheelchair", label: "휠체어", value: p.wheelchair });
  if (p.toilet === "있음") out.push({ key: "toilet", label: "화장실", value: "있음" });
  if (p.accessibleToilet === "있음")
    out.push({ key: "atoilet", label: "장애인화장실", value: "있음" });
  if (p.benches === "예") out.push({ key: "bench", label: "벤치", value: "충분" });
  if (p.type !== "관광지") {
    if (p.standingTable === "있음") out.push({ key: "table", label: "입식 테이블", value: "있음" });
    if (p.floor === "1층") out.push({ key: "floor", label: "자리", value: "1층" });
    if (p.floor === "상층EV있음") out.push({ key: "floor", label: "엘리베이터", value: "있음" });
  }
  // 0m 는 '입구 바로 앞' — 숫자 0 을 그대로 보이지 않는다
  if (p.dropoffM !== null)
    out.push({
      key: "dropoff",
      label: "택시 내려서 입구까지",
      value: p.dropoffM === 0 ? "바로 앞" : `${String(p.dropoffM)}m`,
    });
  return out;
}

/** 확인 배지 문구 (S2-1 ③): 현장 → '모담팀이 직접 확인', 전화 → '전화로 확인', 미확인 → 배지 없음 */
export function verifyBadgeText(v: VerifyStatus): string | null {
  if (v === "현장") return "모담팀이 직접 확인";
  if (v === "전화") return "전화로 확인";
  return null;
}

export const ROLE_LABEL = { am: "오전", lunch: "점심", pm: "오후", cafe: "쉬어 가기" } as const;

/** 공유 글에서 장소 이름 뒤에 붙는 표시 — 점심 · 쉬어 가기만 */
export const ROLE_NOTE: Partial<Record<keyof typeof ROLE_LABEL, string>> = {
  lunch: " (점심)",
  cafe: " (쉬어 가기)",
};

/** 공유 글의 순번 ① ② ③ … (⑳ 까지) */
export const circled = (i: number) => String.fromCharCode(0x2460 + i);
