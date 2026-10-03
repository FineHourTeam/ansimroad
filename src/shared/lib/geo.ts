// 장소 간 이동시간: 시트 좌표의 직선거리 × 도로 계수 ÷ 시내 평균 속도 + 승하차 여유 (부록 A P2, 업체 제안 방식).
// 같은 좌표면 항상 같은 값이 나오므로 결정성(F-12)을 해치지 않는다.

export const TRAVEL = {
  roadFactor: 1.3,
  speedKmh: 25,
  bufferMin: 5,
  roundTo: 5,
} as const;

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function travelMinutes(a: LatLng, b: LatLng): number {
  const km = haversineKm(a, b);
  const raw = (km * TRAVEL.roadFactor * 60) / TRAVEL.speedKmh + TRAVEL.bufferMin;
  return Math.ceil(raw / TRAVEL.roundTo) * TRAVEL.roundTo;
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  return Math.round(haversineKm(a, b) * 1000);
}
