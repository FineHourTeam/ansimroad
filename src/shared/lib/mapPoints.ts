// 코스 → 지도 마커 목록. 응급실 좌표는 설정값 응급실 목록에서 이름으로 찾는다 (시트에 좌표 컬럼 없음).
import type { MapPoint } from "@/shared/components/MapView";
import type { Course, Settings } from "@/shared/domain/types";
import { erDisplayName } from "@/shared/lib/format";

export function courseMapPoints(
  course: Course,
  settings: Pick<Settings, "emergencyRooms">,
): MapPoint[] {
  const pts: MapPoint[] = course.stops.map((s, i) => ({
    lat: s.place.lat,
    lng: s.place.lng,
    name: s.place.name,
    label: String(i + 1),
    kind: "stop",
    id: s.place.id,
  }));
  const er = course.er;
  if (er) {
    const room = settings.emergencyRooms.find((r) => r.name === er.name);
    const lat = er.lat ?? room?.lat;
    const lng = er.lng ?? room?.lng;
    if (lat !== undefined && lng !== undefined)
      pts.push({ lat, lng, name: `응급실 · ${erDisplayName(er.name)}`, label: "✚", kind: "er" });
  }
  return pts;
}
