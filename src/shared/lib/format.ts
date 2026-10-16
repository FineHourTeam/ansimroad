// 화면 문구 라벨. 선택지 문구는 화면 정의서 S1 ④~⑨ 그대로 (F-01).
import type {
  AgeBand,
  Mobility,
  Party,
  StartMin,
  Transport,
  TripInput,
  WalkLimit,
} from "@/shared/domain/types";
import { shortDate } from "@/shared/lib/date";

export const PARTY_OPTIONS: { value: Party; label: string }[] = [
  { value: 1, label: "1명" },
  { value: 2, label: "2명" },
  { value: 3, label: "3명 이상" },
];

export const AGE_OPTIONS: { value: AgeBand; label: string }[] = [
  { value: 40, label: "40대" },
  { value: 50, label: "50대" },
  { value: 60, label: "60대" },
  { value: 70, label: "70대" },
  { value: 80, label: "80대 이상" },
];

export const MOBILITY_OPTIONS: { value: Mobility; label: string; sub: string }[] = [
  { value: "none", label: "문제없음", sub: "평지·계단 모두 괜찮음" },
  { value: "stairs", label: "계단이 어려움", sub: "무릎이 안 좋아 난간 잡고 천천히" },
  { value: "wheelchair", label: "휠체어 사용", sub: "휠체어·전동휠체어" },
];

export const WALK_OPTIONS: { value: WalkLimit; label: string }[] = [
  { value: 10, label: "10분" },
  { value: 20, label: "20분" },
  { value: 30, label: "30분 이상" },
];

export const TRANSPORT_OPTIONS: { value: Transport; label: string }[] = [
  { value: "car", label: "자가용" },
  { value: "transit", label: "택시·버스" },
];

/** 도착 시각 선택지: 오전 9시 ~ 오후 3시, 30분 단위 (9시 전에는 여는 장소가 없다) */
export const START_VALUES: StartMin[] = Array.from({ length: 13 }, (_, i) => 540 + i * 30);

/** 600 → '오전 10시', 750 → '낮 12시 30분', 810 → '오후 1시 30분' */
export function clockLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const part = h < 12 ? "오전" : h === 12 ? "낮" : "오후";
  const h12 = h > 12 ? h - 12 : h;
  return `${part} ${String(h12)}시${m ? ` ${String(m)}분` : ""}`;
}

export const START_OPTIONS: { value: StartMin; label: string }[] = START_VALUES.map((v) => ({
  value: v,
  label: clockLabel(v),
}));

const label = <T>(opts: { value: T; label: string }[], v: T) =>
  opts.find((o) => o.value === v)?.label ?? "";

export const partyLabel = (v: Party) => label(PARTY_OPTIONS, v);
export const ageLabel = (v: AgeBand) => label(AGE_OPTIONS, v);
export const mobilityLabel = (v: Mobility) => label(MOBILITY_OPTIONS, v);
export const walkLabel = (v: WalkLimit) => label(WALK_OPTIONS, v);
export const transportLabel = (v: Transport) => label(TRANSPORT_OPTIONS, v);
/** 칩용: '오전 10시 도착' · '오후 1시 30분 도착' */
export const startLabel = (v: StartMin = 600) => `${clockLabel(v)} 도착`;

/** S2 ② 입력 요약 줄: '70대 · 2명 · 계단이 어려움 · 20분 · 10/18(일) · 택시·버스' */
export function inputSummary(i: TripInput): string {
  return [
    ageLabel(i.age),
    partyLabel(i.party),
    mobilityLabel(i.mobility),
    walkLabel(i.walk),
    shortDate(i.date),
    startLabel(i.start),
    transportLabel(i.transport),
  ].join(" · ");
}

/** 'tel:' 링크용 숫자만 남기기 */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}

/** 네이버 지도 검색 링크 (앱이 있으면 앱, 없으면 웹) */
export function naverMapLink(name: string, address?: string): string {
  const q = address ? `${name} ${address}` : name;
  return `https://map.naver.com/p/search/${encodeURIComponent(q)}`;
}

/**
 * 네이버 지도 길찾기 (목적지 = 장소 좌표). 웹은 길찾기 화면, 휴대폰은 좌표를 그대로 넘겨 네이버 지도 앱으로 연결된다
 * (2026-10-16 확인: map.naver.com/p/directions 는 경도,위도 순서). transit = 대중교통
 */
export function naverDirectionsLink(
  place: { name: string; lat: number; lng: number },
  transport: Transport = "car",
): string {
  const goal = `${String(place.lng)},${String(place.lat)},${encodeURIComponent(place.name)},,`;
  return `https://map.naver.com/p/directions/-/${goal}/-/${transport === "car" ? "car" : "transit"}`;
}

export function kmText(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${String(meters)} m`;
}

/** 응급실 이름을 화면에 짧게: 법인 앞머리('의료법인○○재단' 등)를 뗀다. 다 떼면 원래 이름 */
export function erDisplayName(name: string): string {
  const short = name.replace(/^(의료법인|재단법인|사회복지법인|학교법인)\s*\S*?(재단|학원)\s*/, "");
  return short || name;
}
