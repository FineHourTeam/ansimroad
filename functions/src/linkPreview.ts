// 부모님 링크(/t/{token}) · 자녀 링크(/f/{token}) 카카오톡 미리보기 카드의 순수 로직 (테스트 가능하게 분리).
// 카카오톡 미리보기는 자바스크립트를 실행하지 않고 HTML 의 og 태그만 읽는다 → Hosting rewrite 로 이 함수가 앱 HTML 에 여행별 제목을 넣어 돌려준다.
// 제목: '안심로드 · 10월 18일 바다 코스' · 설명: 슬로건 (모담 확정 문구 2026-10-16)

export const SLOGAN = "부모님 여행은 편안하게, 자녀의 마음은 안심하게";
export const SITE = "안심로드";

/** '/t/AbCdEfGhIj' → 부모님 링크, '/f/AbCdEfGhIj' → 자녀 링크 (앱의 토큰 규칙: 영문 · 숫자 10자 이상) */
export function linkToken(path: string): { token: string; role: "senior" | "family" } | null {
  const m = /^\/([tf])\/([A-Za-z0-9]{10,})\/?$/.exec(path);
  if (!m?.[2]) return null;
  return { token: m[2], role: m[1] === "t" ? "senior" : "family" };
}

/** '2026-10-18' + '바다 코스' → '안심로드 · 10월 18일 바다 코스' */
export function previewTitle(ymd: string, courseTitle: string): string | null {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return `${SITE} · ${String(Number(m[1]))}월 ${String(Number(m[2]))}일 ${courseTitle.trim()}`;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${String(c.charCodeAt(0))};`);

/** 앱 HTML 의 og:title · og:description · twitter 제목을 바꾼다. 코스 이름은 자녀가 쓴 값이라 반드시 이스케이프 */
export function injectMeta(html: string, meta: { title: string; description: string }): string {
  const title = escapeHtml(meta.title);
  const desc = escapeHtml(meta.description);
  // 바꿀 값은 함수로 넘긴다: 문자열로 넘기면 코스 이름 속 '$&' · "$'" 가 특수 패턴으로 읽힌다
  return html
    .replace(
      /(<meta property="og:title" content=")[^"]*(")/,
      (_, a: string, b: string) => a + title + b,
    )
    .replace(
      /(<meta property="og:description" content=")[^"]*(")/,
      (_, a: string, b: string) => a + desc + b,
    );
}

/** HTML 을 가져올 주소: Hosting 이 넘긴 호스트가 Firebase Hosting 주소일 때만 (그 밖은 기본 사이트) */
export function htmlOrigin(forwardedHost: string | undefined): string {
  const host = (forwardedHost ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return /^[a-z0-9-]+(--[a-z0-9-]+)?\.(web\.app|firebaseapp\.com)$/.test(host)
    ? `https://${host}`
    : "https://ansimroad.web.app";
}
