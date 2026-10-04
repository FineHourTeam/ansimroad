// 현재 시각. 시연·검수 때만 ?now=2026-10-18T12:20 으로 시계를 바꿀 수 있다 (VITE_ALLOW_DEMO_CLOCK).
import { env } from "@/lib/env";
const KEY = "sr.demoNow";

function allowed(): boolean {
  return env.VITE_ALLOW_DEMO_CLOCK || import.meta.env.DEV;
}

/** 앱 시작 때 한 번 호출: URL의 ?now= 값을 세션에 기억한다 (?now=off 로 해제). */
export function captureDemoClock(search: string): void {
  if (!allowed()) return;
  const v = new URLSearchParams(search).get("now");
  try {
    if (v === "off") sessionStorage.removeItem(KEY);
    else if (v && !Number.isNaN(new Date(v).getTime())) {
      sessionStorage.setItem(KEY, JSON.stringify({ at: v, setAt: Date.now() }));
    }
  } catch {
    /* 저장소를 못 쓰면 실제 시각 사용 */
  }
}

export function now(): Date {
  if (allowed()) {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const { at, setAt } = JSON.parse(raw) as { at: string; setAt: number };
        // 설정한 시각에서 실제 흐른 시간만큼 진행
        return new Date(new Date(at).getTime() + (Date.now() - setAt));
      }
    } catch {
      /* 무시 */
    }
  }
  return new Date();
}

export function isDemoClock(): boolean {
  try {
    return allowed() && sessionStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}
