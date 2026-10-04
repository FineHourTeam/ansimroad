import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  emptyRecord,
  normalizeRecord,
  recordsToCsv,
  recordsToPlaces,
  toRecords,
  validateRecord,
} from "@/shared/data/placeRecords";
import { COLUMNS, parsePlaceRows } from "@/shared/data/placeSchema";
import { parseCsv } from "@/shared/data/csv";

function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined)
    throw new Error(`index ${String(i)} out of range (length ${String(arr.length)})`);
  return v;
}

const rows = parseCsv(
  readFileSync(resolve(__dirname, "../../../public/data/places.demo.csv"), "utf8"),
);
const base = toRecords(rows);
const first = at(base, 0);

describe("장소 조사표 35칸 레코드", () => {
  it("원본 CSV를 35칸 레코드로 읽는다 (룰 표시 줄은 건너뜀)", () => {
    expect(COLUMNS).toHaveLength(35);
    expect(base.length).toBe(parsePlaceRows(rows).places.length);
    expect(first.ID).toMatch(/^A/);
    for (const r of base) expect(Object.keys(r)).toEqual([...COLUMNS]);
  });

  it("레코드 → Place 는 원본 CSV 를 바로 읽은 것과 같다", () => {
    const fromCsv = parsePlaceRows(rows);
    const fromRecords = recordsToPlaces(base);
    expect(fromRecords.places).toHaveLength(fromCsv.places.length);
    expect(fromRecords.places).toEqual(fromCsv.places);
    expect(fromRecords.skipped).toEqual([]);
  });

  it("Firestore 문서 정규화: 없는 칸은 빈 문자열, 숫자는 문자열로, 모르는 칸은 버린다", () => {
    const rec = normalizeRecord({ ID: "A0001", 위도: 34.79, 장소명: null, 모르는칸: "x" });
    expect(rec.ID).toBe("A0001");
    expect(rec.위도).toBe("34.79");
    expect(rec.장소명).toBe("");
    expect(rec.비고).toBe("");
    expect(Object.keys(rec)).toEqual([...COLUMNS]);
    expect(rec).not.toHaveProperty("모르는칸");
    expect(normalizeRecord({})).toEqual(emptyRecord());
  });

  it("저장 전 검증은 시트와 같은 규칙", () => {
    expect(validateRecord(first)).toBeNull();
    expect(validateRecord({ ...first, 계단: "조금" })).toContain("계단");
    expect(validateRecord({ ...first, 위도: "10" })).toContain("위도");
  });

  it("CSV 내보내기는 BOM 으로 시작하고, 다시 읽으면 같은 데이터", () => {
    const csv = recordsToCsv(base);
    const bom = String.fromCharCode(0xfeff);
    expect(csv.startsWith(bom)).toBe(true);
    const again = toRecords(parseCsv(csv.slice(bom.length)));
    expect(again).toEqual(base);
  });
});
