// 한국관광공사 TourAPI 프록시의 순수 로직 (테스트 가능하게 분리).
// 서비스 키는 서버(시크릿 TOURAPI_KEY)에서만 붙인다 — 브라우저 번들에 넣지 않는다.

/** 관리자 페이지(src/features/admin/api/tourapi.ts)가 부르는 API만 허용 */
export const ALLOWED = new Set([
  "KorService2/searchKeyword2",
  "KorService2/detailCommon2",
  "KorService2/detailIntro2",
  "KorService2/detailImage2",
  "KorWithService2/detailWithTour2",
]);

const UPSTREAM = "https://apis.data.go.kr/B551011/";

/** 들어온 경로(Hosting 경유 "/api/tourapi/X/Y" 또는 함수 직접 "/X/Y") → 허용된 API 경로 또는 null */
export function apiPath(reqPath: string): string | null {
  const p = reqPath.replace(/^\/+/, "").replace(/^api\/tourapi\//, "");
  return ALLOWED.has(p) ? p : null;
}

/** 관광공사 주소. 클라이언트가 보낸 serviceKey 는 버리고 서버 키를 붙인다 */
export function upstreamUrl(
  path: string,
  query: Record<string, unknown>,
  serviceKey: string,
): string {
  const url = new URL(path, UPSTREAM);
  for (const [k, v] of Object.entries(query)) {
    if (k.toLowerCase() === "servicekey" || typeof v !== "string") continue;
    url.searchParams.set(k, v);
  }
  url.searchParams.set("serviceKey", serviceKey);
  return url.toString();
}
