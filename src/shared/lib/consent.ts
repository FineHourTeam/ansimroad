// 어르신 첫 진입 동의(F-28). 선택은 이 기기에 기억해 같은 기기에서는 다시 띄우지 않는다.
import type { ConsentChoice } from "@/shared/domain/types";

const key = (token: string) => `sr.consent.${token}`;

export function getConsent(token: string): ConsentChoice | null {
  try {
    const v = localStorage.getItem(key(token));
    return v === "agree" || v === "no_location" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(token: string, choice: ConsentChoice): void {
  try {
    localStorage.setItem(key(token), choice);
  } catch {
    /* 저장 실패 시 이번 방문 동안만 유지 */
  }
}
