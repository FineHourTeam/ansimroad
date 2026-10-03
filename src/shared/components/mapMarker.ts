// 지도 마커 공용 정의 (네이버 지도 · 약도가 함께 쓴다)
export interface MapPoint {
  lat: number;
  lng: number;
  name: string;
  label: string; // 마커 글자 ('1'…'4', 응급실 '✚' — 약도에서는 병원 아이콘으로 그린다)
  kind: "stop" | "er" | "cand"; // cand = 코스에 넣을 수 있는 다른 장소 (수정 모드)
  id?: string; // 장소 ID (수정 모드에서 마커를 눌렀을 때 구분)
  /** 누르면 일어나는 일 (예: " (눌러서 추가)"). 이름표에는 안 쓰고 마커의 읽는 이름·툴팁에만 붙인다 */
  hint?: string;
}

/** 마커의 읽는 이름 (스크린리더 · 툴팁) */
export const markerName = (p: MapPoint) => `${p.name}${p.hint ?? ""}`;

export const MARKER_CLASS: Record<MapPoint["kind"], string> = {
  stop: "bg-primary text-primary-foreground size-8 text-sm",
  er: "bg-emergency text-emergency-foreground size-8 text-xs",
  cand: "bg-muted-foreground text-background size-6 text-xs",
};

export interface MapProps {
  points: MapPoint[];
  onSelect?: (p: MapPoint) => void;
  selectedId?: string | null;
  onMapClick?: (lat: number, lng: number) => void;
}
