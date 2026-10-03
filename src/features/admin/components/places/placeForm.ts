// 장소 데이터 편집의 순수 로직: 조사표 35칸 묶음 · 새 ID · 검색 · 저장 전 검사 · 관광공사 값 합치기
import { isValidPlaceId } from "@/features/places";
import type { MapPoint } from "@/shared/components/MapView";
import type { Column } from "@/shared/data/placeSchema";
import { recordsToPlaces, validateRecord, type PlaceRecord } from "@/shared/data/placeRecords";
import type { RowIssue } from "@/shared/domain/types";

export interface Field {
  col: Column;
  label?: string;
  hint?: string;
  type?: "num" | "date" | "long";
}

/** 조사표 35칸 (ID 제외 34칸) — 시트와 같은 순서 · 같은 묶음 */
export const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "기본",
    fields: [
      { col: "장소명" },
      { col: "유형" },
      { col: "지역", hint: "예: 목포" },
      { col: "권역", hint: "예: 유달산케이블카권" },
      { col: "주테마" },
      { col: "부테마" },
      { col: "주소", type: "long" },
      { col: "전화", hint: "번호가 둘이면 / 로 구분" },
      { col: "위도", type: "num", hint: "지도를 눌러 정할 수 있어요" },
      { col: "경도", type: "num" },
    ],
  },
  {
    title: "접근성",
    fields: [
      { col: "휠체어접근" },
      { col: "계단" },
      { col: "필수보행(분)", type: "num" },
      { col: "어르신관람시간(분)", type: "num", label: "머무는 시간(분)" },
      { col: "실내여부" },
      { col: "벤치충분" },
      { col: "편안함등급", hint: "비우면 걷는 시간 · 실내 · 벤치로 자동 계산" },
      { col: "화장실" },
      { col: "장애인화장실" },
      { col: "하차~입구(m)", type: "num" },
      { col: "주차장" },
      { col: "입식테이블" },
      { col: "층/엘리베이터" },
    ],
  },
  {
    title: "운영",
    fields: [
      { col: "휴무요일", hint: "없음 / 월 / 화·수 / 일(2·4째)" },
      { col: "운영시간", hint: "09:00-18:00" },
    ],
  },
  {
    title: "안전",
    fields: [
      { col: "최근접응급실" },
      { col: "응급실전화" },
      { col: "응급실이동(분)", type: "num" },
      { col: "최근접약국" },
    ],
  },
  {
    title: "확인 · 사진 · 비고",
    fields: [
      { col: "확인상태", hint: "현장 · 전화면 사용자 화면에 확인 배지" },
      { col: "확인일", type: "date" },
      { col: "확인자" },
      { col: "사진URL", type: "long", hint: "여러 장이면 | 로 구분 (옆으로 넘겨 보기)" },
      { col: "비고", type: "long" },
    ],
  },
];

/** 시트 필수 칸 (ID 포함) — 라벨에 * 표시 */
export const REQUIRED_COLS: readonly Column[] = ["ID", "장소명", "유형", "권역", "위도", "경도"];

/** 새 장소 ID: N0001 형식에서 가장 큰 번호 + 1 */
export function nextId(records: PlaceRecord[]): string {
  const n = records
    .map((r) => /^N(\d+)$/.exec(r.ID)?.[1])
    .filter((v): v is string => !!v)
    .map(Number);
  return `N${String((n.length ? Math.max(...n) : 0) + 1).padStart(4, "0")}`;
}

export type View = "all" | "skipped" | "unverified";

/** 장소명 · ID · 권역 검색 + 보기 (전체 · 코스에서 빠진 곳 · 확인 안 된 곳) */
export function filterRecords(
  records: PlaceRecord[],
  q: string,
  view: View,
  skipped: ReadonlyMap<string, string>,
): PlaceRecord[] {
  const s = q.trim();
  return records.filter(
    (r) =>
      (!s || r.장소명.includes(s) || r.ID.includes(s) || r.권역.includes(s)) &&
      (view === "all" ||
        (view === "skipped" && skipped.has(r.ID)) ||
        (view === "unverified" && (r.확인상태 === "" || r.확인상태 === "미확인"))),
  );
}

/** 저장 전 검사: ID 규칙 · 새 장소 ID 중복 · 시트와 같은 규칙. 문제없으면 null */
export function draftProblem(
  draft: PlaceRecord,
  records: PlaceRecord[],
  isNew: boolean,
): string | null {
  if (!isValidPlaceId(draft.ID)) return "ID에 '/'나 공백은 쓸 수 없어요";
  if (isNew && records.some((r) => r.ID === draft.ID))
    return "같은 ID가 이미 있어요. 다른 ID를 써 주세요";
  return validateRecord(draft);
}

export const splitPhotos = (v: string): string[] => v.split(/[\s|]+/).filter(Boolean);
export const joinPhotos = (urls: string[]): string => [...new Set(urls)].join(" | ");

/** 지금 장소의 빈 칸만 관광공사 값으로 채우고, 비고 · 사진은 덧붙인다 */
export function fillBlanks(cur: PlaceRecord, fields: Partial<PlaceRecord>): PlaceRecord {
  const next = { ...cur };
  for (const [k, v] of Object.entries(fields) as [Column, string | undefined][]) {
    if (!v) continue;
    if (k === "비고") next.비고 = [cur.비고, v].filter(Boolean).join("\n");
    else if (k === "사진URL")
      next.사진URL = joinPhotos([...splitPhotos(cur.사진URL), ...splitPhotos(v)]);
    else if (!cur[k]) next[k] = v;
  }
  return next;
}

/** 관광공사 값으로 새 장소 (나머지 칸은 비움) */
export function recordFrom(base: PlaceRecord, fields: Partial<PlaceRecord>): PlaceRecord {
  const next = { ...base };
  for (const [k, v] of Object.entries(fields) as [Column, string | undefined][]) {
    if (v !== undefined && k !== "ID") next[k] = v;
  }
  return next;
}

/** 이미 가져온 관광공사 장소 (비고의 contentid) */
export function tourIds(records: PlaceRecord[]): Set<string> {
  return new Set(
    records.map((r) => /contentid=(\d+)/.exec(r.비고)?.[1]).filter((v): v is string => !!v),
  );
}

/** 좌표가 있는 장소 → 지도 점 (회색 후보). current 는 ★ 로 맨 앞 */
export function placePoints(
  records: PlaceRecord[],
  current?: Pick<PlaceRecord, "ID" | "장소명" | "위도" | "경도">,
): MapPoint[] {
  const pts: MapPoint[] = records
    .filter((r) => r.ID !== current?.ID && Number(r.위도) && Number(r.경도))
    .map((r) => ({
      lat: Number(r.위도),
      lng: Number(r.경도),
      name: r.장소명,
      label: "",
      kind: "cand",
      id: r.ID,
    }));
  if (current && Number(current.위도) && Number(current.경도)) {
    pts.unshift({
      lat: Number(current.위도),
      lng: Number(current.경도),
      name: current.장소명 || "새 장소",
      label: "★",
      kind: "stop",
      id: current.ID,
    });
  }
  return pts;
}

export interface CsvPreview {
  /** 넣을 장소 (ID 규칙을 지킨 행 — 같은 ID 가 여러 번이면 마지막 행 하나) */
  ok: PlaceRecord[];
  /** ID 가 비었거나 '/' · 공백이 있어 뺄 행 수 */
  badIds: number;
  /** 이미 있어서 덮어쓸 장소 수 */
  overwrite: number;
  /** 저장은 되지만 코스 생성에서 빠질 행 (시트와 같은 규칙) */
  skipped: RowIssue[];
}

/** CSV 가져오기 미리 보기: 몇 곳을 넣고, 무엇을 덮어쓰고, 무엇이 빠지는지 */
export function csvPreview(records: PlaceRecord[], existing: PlaceRecord[]): CsvPreview {
  const valid = records.filter((r) => isValidPlaceId(r.ID));
  // 같은 ID 가 여러 번이면 마지막 행만 (저장도 ID 문서 하나라 결과가 같다)
  const ok = [...new Map(valid.map((r) => [r.ID, r])).values()];
  const have = new Set(existing.map((r) => r.ID));
  return {
    ok,
    badIds: records.length - valid.length,
    overwrite: ok.filter((r) => have.has(r.ID)).length,
    skipped: recordsToPlaces(ok).skipped,
  };
}
