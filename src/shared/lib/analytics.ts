// 사용 통계(N-12): GA4. 주소의 토큰 부분은 지우고('/t', '/f'), 사진·위치·시각 값은 보내지 않는다.
// 이벤트 5개: 코스 생성 · 다른 코스 보기 · 코스 확정 · 카카오톡 공유 · 사진 남기기
import { env } from "@/lib/env";

export type AnalyticsEvent =
  | "course_generate"
  | "course_regenerate"
  | "course_confirm"
  | "share_kakao"
  | "photo_upload"
  | "photo_upload_fail" // 실패 원인(reason)만 싣는다 — 기기에서만 나는 업로드 실패를 찾으려고 (2026-10-16)
  | "trip_complete"
  | "report_share";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const ID = env.VITE_GA4_ID;
let ready = false;

/** '/t/AbC123xyz9' → '/t', '/f/xxx/print' → '/f/print' */
export function sanitizePath(pathname: string): string {
  const cleaned = pathname.replace(/^\/(t|f|r)\/[^/]+/, "/$1").replace(/\/+$/, "");
  return cleaned || "/";
}

/** 통계가 꺼진 개발 · E2E 환경에서 어떤 이벤트가 나갔을지 콘솔로 확인한다 (프로덕션 빌드에는 안 남는다) */
function devLog(...args: string[]): void {
  // eslint-disable-next-line no-console -- 개발 전용 확인 로그 (E2E 가 이 줄로 이벤트를 검사한다)
  if (import.meta.env.DEV) console.debug("[통계]", ...args);
}

function sanitizedLocation(): string {
  return `${location.origin}${sanitizePath(location.pathname)}`;
}

export function initAnalytics(): void {
  if (!ID || ready) return;
  ready = true;
  const dataLayer = (window.dataLayer ??= []);
  window.gtag = function gtag() {
    // gtag 는 arguments 객체를 그대로 넣어야 동작한다
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", ID, { send_page_view: false, page_location: sanitizedLocation() });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
  document.head.appendChild(s);
}

export function trackPageView(): void {
  const page_location = sanitizedLocation();
  if (!ID || !window.gtag) {
    devLog("page_view", sanitizePath(location.pathname)); // 통계 꺼짐 (VITE_GA4_ID 없음)
    return;
  }
  window.gtag("set", { page_location, page_referrer: "" });
  window.gtag("event", "page_view", { page_location, page_title: document.title });
}

export function track(event: AnalyticsEvent, params?: Record<string, string>): void {
  if (!ID || !window.gtag) {
    devLog(event, ...(params ? [JSON.stringify(params)] : []));
    return;
  }
  window.gtag("set", { page_location: sanitizedLocation() });
  window.gtag("event", event, params);
}

/** 실패 원인 (통계용): Firebase 오류 코드 · 시간 초과 · 그 밖은 오류 이름. 사진 · 위치 값은 싣지 않는다 */
export function failReason(e: unknown): string {
  if (typeof e === "object" && e !== null && "code" in e && typeof e.code === "string")
    return e.code;
  if (e instanceof Error) return e.name === "Error" ? e.message || "Error" : e.name;
  return "unknown";
}
