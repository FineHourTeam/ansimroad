// 장소 사진 중계 (/api/img?u=…): '여행 일정 한눈에 보기'를 이미지로 저장할 때 관광공사 사진을 같은 출처로 받아 준다.
// 관광공사 사진 서버는 CORS 를 막아 브라우저가 사진을 그림으로 담지 못한다. 열린 중계가 되지 않게 허용한 주소만 받는다.

/** 받아 줄 사진 서버 */
export const IMG_HOSTS = new Set(["tong.visitkorea.or.kr"]);
/** 사진 한 장 상한 */
export const MAX_IMG_BYTES = 8 * 1024 * 1024;

/** 허용한 사진 주소면 URL, 아니면 null */
export function proxyTarget(u: unknown): URL | null {
  if (typeof u !== "string" || u.length > 2000) return null;
  let url: URL;
  try {
    url = new URL(u);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.port) return null;
  return IMG_HOSTS.has(url.hostname) ? url : null;
}
