// 위치(F-17·F-18). 위치 수집 설정(F-24)이 ON이고 동의 화면에서 '동의하고 시작'을 고른 경우에만 호출한다.
// 기본(OFF)에서는 이 파일의 함수가 불리지 않으므로 위치 권한 요청이 뜨지 않는다.

export type PositionResult =
  { ok: true; lat: number; lng: number } | { ok: false; reason: "denied" | "unavailable" };

const DENIED_KEY = "sr.geoDenied";

/** 한 번 거부되면 다시 요청하지 않는다 (F-18). */
export function wasDenied(): boolean {
  try {
    return localStorage.getItem(DENIED_KEY) === "1";
  } catch {
    return false;
  }
}

export function getPosition(timeoutMs = 8000): Promise<PositionResult> {
  if (!("geolocation" in navigator) || wasDenied())
    return Promise.resolve({ ok: false, reason: "denied" });
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          try {
            localStorage.setItem(DENIED_KEY, "1");
          } catch {
            /* 무시 */
          }
          resolve({ ok: false, reason: "denied" });
        } else resolve({ ok: false, reason: "unavailable" });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}
