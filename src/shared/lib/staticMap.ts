// 네이버 정적 지도(Static Map v2 · raster-cors) 주소와 그 위에 겹쳐 그릴 점 위치.
// 정적 지도는 경로선을 그리지 못해서 번호 · 선은 우리가 위에 그린다. 그래서 중심 · 확대 수준을 우리가 정하고
// 같은 메르카토르 투영으로 점 위치를 낸다. raster-cors 는 Client Secret 없이 등록된 웹 주소(Referer)로 인증한다.
// 네이버 정적 지도의 level L 은 세계 폭이 512·2^L px 이다 (일반 256px 타일보다 한 단계 크다 — 2026-10-29 실측).

export interface LatLng {
  lat: number;
  lng: number;
}

export interface StaticView {
  level: number;
  center: LatLng;
  /** 지도 칸 왼쪽 위 = (0, 0) 기준 픽셀 위치 */
  toPx: (p: LatLng) => { x: number; y: number };
}

const MAX_LEVEL = 16; // 장소가 한곳에 몰려도 동네가 보이게
const mx = (lng: number) => (lng + 180) / 360;
const my = (lat: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};
const world = (level: number) => 512 * 2 ** level;

/** w × h 칸에 점들이 가장자리 pad 만큼 띄우고 다 들어오는 가장 큰 확대 수준과 그 중심 */
export function staticView(points: LatLng[], w: number, h: number, pad = 40): StaticView {
  const xs = points.map((p) => mx(p.lng));
  const ys = points.map((p) => my(p.lat));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  let level = MAX_LEVEL;
  while (
    level > 0 &&
    ((x1 - x0) * world(level) > w - 2 * pad || (y1 - y0) * world(level) > h - 2 * pad)
  )
    level -= 1;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const center = {
    lng: cx * 360 - 180,
    lat: (Math.atan(Math.sinh(Math.PI * (1 - 2 * cy))) * 180) / Math.PI,
  };
  const size = world(level);
  return {
    level,
    center,
    toPx: (p) => ({ x: (mx(p.lng) - cx) * size + w / 2, y: (my(p.lat) - cy) * size + h / 2 }),
  };
}

/** 정적 지도 그림 주소 (scale=2: 같은 넓이를 두 배 픽셀로 — 이미지 저장 · 고해상도 화면용). w · h 는 1~1024 */
export function staticMapUrl(clientId: string, view: StaticView, w: number, h: number): string {
  const q = new URLSearchParams({
    w: String(w),
    h: String(h),
    center: `${view.center.lng.toFixed(6)},${view.center.lat.toFixed(6)}`,
    level: String(view.level),
    scale: "2",
    format: "png",
    "X-NCP-APIGW-API-KEY-ID": clientId,
  });
  return `https://maps.apigw.ntruss.com/map-static/v2/raster-cors?${q.toString()}`;
}
