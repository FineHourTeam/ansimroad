// 장소 조사표 35칸 레코드 — Firestore `places/{ID}` 문서의 모양 그대로.
// 원본은 Firestore(운영진 페이지에서 편집). 처음 넣을 때는 운영진 페이지의 CSV 가져오기를 쓴다.
// 검증은 시트와 같은 규칙(parsePlaceRows)을 그대로 쓴다.
import {
  COLUMNS,
  normalizeHeader,
  parsePlaceRows,
  type Column,
  type ParseResult,
} from "@/shared/data/placeSchema";

export type PlaceRecord = Record<Column, string>;

export const emptyRecord = (): PlaceRecord =>
  Object.fromEntries(COLUMNS.map((c) => [c, ""])) as PlaceRecord;

/** CSV 행 배열 → 35칸 레코드 (맨 위 룰 표시 줄은 건너뛴다) */
export function toRecords(rows: string[][]): PlaceRecord[] {
  const h = rows.findIndex((r) => {
    const n = r.map(normalizeHeader);
    return n.includes("ID") && n.includes("장소명");
  });
  const headerRow = rows[h];
  if (!headerRow) return [];
  const header = headerRow.map(normalizeHeader);
  return rows
    .slice(h + 1)
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => {
      const rec = emptyRecord();
      header.forEach((name, i) => {
        if ((COLUMNS as readonly string[]).includes(name))
          rec[name as Column] = (r[i] ?? "").trim();
      });
      return rec;
    });
}

/** Firestore 등에서 읽은 임의 객체 → 35칸 레코드 (없는 칸은 빈 문자열, 문자열이 아니면 문자열로) */
export function normalizeRecord(raw: Record<string, unknown>): PlaceRecord {
  const rec = emptyRecord();
  for (const c of COLUMNS) {
    const v = raw[c];
    rec[c] =
      typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : "";
  }
  return rec;
}

/** 레코드 → Place 목록 + 검증에서 빠진 행 (시트와 같은 규칙) */
export function recordsToPlaces(records: PlaceRecord[]): ParseResult {
  return parsePlaceRows([[...COLUMNS], ...records.map((r) => COLUMNS.map((c) => r[c]))]);
}

/** 저장 전 검증: 시트와 같은 규칙. 문제없으면 null */
export function validateRecord(rec: PlaceRecord): string | null {
  const r = recordsToPlaces([rec]);
  return r.skipped[0]?.reason ?? null;
}

/** 시트에 그대로 붙여 넣을 수 있는 CSV (엑셀 한글이 깨지지 않게 BOM) */
export function recordsToCsv(records: PlaceRecord[]): string {
  const q = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return (
    "﻿" +
    [COLUMNS.join(","), ...records.map((r) => COLUMNS.map((c) => q(r[c])).join(","))].join("\n")
  );
}
