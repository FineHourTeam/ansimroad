// 장소 조사표 v1(35컬럼) → Place 변환과 행 단위 검증 (D-01, D-02 ②).
// 드롭다운 값이 아닌 값이 있거나 필수 칸이 빈 행은 그 행만 빼고, 나머지 행은 정상 처리한다.
import { parseHhmm } from "@/shared/lib/date";
import type {
  ClosedRule,
  Comfort,
  Place,
  PlaceType,
  RowIssue,
  Theme,
  VerifyStatus,
} from "@/shared/domain/types";

export const COLUMNS = [
  "ID",
  "장소명",
  "유형",
  "지역",
  "권역",
  "주테마",
  "부테마",
  "주소",
  "전화",
  "위도",
  "경도",
  "휠체어접근",
  "계단",
  "필수보행(분)",
  "어르신관람시간(분)",
  "실내여부",
  "벤치충분",
  "편안함등급",
  "화장실",
  "장애인화장실",
  "하차~입구(m)",
  "주차장",
  "휴무요일",
  "운영시간",
  "입식테이블",
  "층/엘리베이터",
  "최근접응급실",
  "응급실전화",
  "응급실이동(분)",
  "최근접약국",
  "확인상태",
  "확인일",
  "확인자",
  "사진URL",
  "비고",
] as const;
export type Column = (typeof COLUMNS)[number];

const REQUIRED: Column[] = ["ID", "장소명", "유형", "권역", "위도", "경도"];

/** 시트 드롭다운 목록 (첨부3 데이터 유효성 검사와 동일). 권역·지역은 확장 대비로 검사하지 않는다. */
export const ENUMS = {
  유형: ["관광지", "식당", "카페휴식"],
  주테마: ["바다", "역사문화", "자연경치"],
  부테마: ["바다", "역사문화", "자연경치"],
  휠체어접근: ["가능", "일부", "불가"],
  계단: ["없음", "우회가능", "있음"],
  실내여부: ["실내", "실외", "혼합"],
  벤치충분: ["예", "아니오"],
  편안함등급: ["상", "중", "하"],
  화장실: ["있음", "없음"],
  장애인화장실: ["있음", "없음", "미확인"],
  주차장: ["있음", "없음"],
  입식테이블: ["있음", "없음"],
  "층/엘리베이터": ["1층", "상층EV있음", "상층EV없음"],
  확인상태: ["현장", "전화", "미확인"],
} as const satisfies Partial<Record<Column, readonly string[]>>;

const NUMERIC: Column[] = ["필수보행(분)", "어르신관람시간(분)", "하차~입구(m)", "응급실이동(분)"];

const WEEKDAY_CHARS = "일월화수목금토";

/**
 * 휴무요일 해석 (부록 A X4, D-01).
 * '없음' / '월' / '화·수' / '월(공휴일 시 익일)' / '일(2·4째)' / '월(1·3째)'
 * 괄호 안이 'n·m째'면 그 달의 n·m번째 요일만 휴무. 그 밖의 괄호 설명은 매주 휴무로 본다.
 */
export function parseClosedDays(raw: string): ClosedRule[] | null {
  const s = raw.trim();
  if (s === "" || s === "없음" || s === "연중무휴" || s === "무휴") return [];
  const rules: ClosedRule[] = [];
  const re = /([일월화수목금토])(?:요일)?\s*(?:\(([^)]*)\))?/g;
  for (const m of s.matchAll(re)) {
    const weekday = WEEKDAY_CHARS.indexOf(m[1] ?? "");
    let nth: number[] | null = null;
    const paren = m[2]?.trim();
    if (paren?.includes("째")) {
      const nums = paren
        .replace(/째.*/, "")
        .split(/[·,\s/]+/)
        .map(Number)
        .filter((n) => n >= 1 && n <= 5);
      if (nums.length === 0) return null;
      nth = nums;
    }
    rules.push({ weekday, nth });
  }
  // 요일 글자를 하나도 못 찾았으면 해석 불가 → 행 제외
  if (rules.length === 0) return null;
  // 구분자(·, 쉼표, 공백)를 빼고 남는 글자가 있으면 해석 불가
  const rest = s.replace(re, "").replace(/[·,\s/]/g, "");
  if (rest.length > 0) return null;
  return rules;
}

export function parseHours(raw: string): { open: number | null; close: number | null } {
  const m = /^\s*(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})\s*$/.exec(raw);
  if (!m) return { open: null, close: null };
  return { open: parseHhmm(m[1] ?? ""), close: parseHhmm(m[2] ?? "") };
}

/** 부록 A.4 편안함등급: 필수보행 ≤ 10 & (실내 or 벤치충분) → 상 / ≤ 20 → 중 / 그 외 하 */
export function computeComfort(
  walkMin: number | null,
  indoor: string | null,
  benches: string | null,
): Comfort {
  if (walkMin === null) return "하";
  if (walkMin <= 10 && (indoor === "실내" || benches === "예")) return "상";
  if (walkMin <= 20) return "중";
  return "하";
}

export function normalizeHeader(cell: string): string {
  // 구글시트 gviz CSV는 위 두 줄(룰 표시 + 컬럼명)을 'P6 ID'처럼 합쳐 줄 수 있다 → 마지막 단어만 쓴다.
  const parts = cell.trim().split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

function toNumber(v: string): number | null | "invalid" {
  if (v.trim() === "") return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : "invalid";
}

function upgradePhotoUrl(url: string): string | null {
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return null;
  // 한국관광공사 이미지 서버는 https 를 지원하므로 혼합 콘텐츠 차단을 피하려고 https 로 바꾼다.
  return u.replace(/^http:\/\/tong\.visitkorea\.or\.kr/i, "https://tong.visitkorea.or.kr");
}

export interface ParseResult {
  places: Place[];
  skipped: RowIssue[];
  missingColumns: string[];
}

/** CSV 행 배열(맨 위 룰 표시 줄 포함 가능)을 Place 목록으로 바꾼다. */
export function parsePlaceRows(rows: string[][]): ParseResult {
  const headerIdx = rows.findIndex((r) => {
    const names = r.map(normalizeHeader);
    return names.includes("ID") && names.includes("장소명");
  });
  const headerRow = rows[headerIdx];
  if (!headerRow) return { places: [], skipped: [], missingColumns: [...COLUMNS] };

  const header = headerRow.map(normalizeHeader);
  const colIndex = new Map<string, number>();
  header.forEach((name, i) => {
    if (!colIndex.has(name)) colIndex.set(name, i);
  });
  const missingColumns = REQUIRED.filter((c) => !colIndex.has(c));
  if (missingColumns.length > 0) return { places: [], skipped: [], missingColumns };

  const places: Place[] = [];
  const skipped: RowIssue[] = [];
  const seen = new Set<string>();

  rows.slice(headerIdx + 1).forEach((r, offset) => {
    const rowNo = headerIdx + offset + 2;
    const get = (c: Column) => {
      const i = colIndex.get(c);
      return i === undefined ? "" : (r[i] ?? "").trim();
    };
    const id = get("ID");
    const fail = (reason: string) => skipped.push({ row: rowNo, id, reason });

    for (const c of REQUIRED) {
      if (get(c) === "") return fail(`'${c}' 칸이 비어 있어요`);
    }
    if (seen.has(id)) return fail("ID가 겹쳐요");

    for (const [col, allowed] of Object.entries(ENUMS) as [Column, readonly string[]][]) {
      const v = get(col);
      if (v !== "" && !allowed.includes(v)) return fail(`'${col}'에 넣을 수 없는 값이에요: '${v}'`);
    }

    const nums: Partial<Record<Column, number | null>> = {};
    for (const c of NUMERIC) {
      const n = toNumber(get(c));
      if (n === "invalid") return fail(`'${c}' 값이 숫자가 아니에요`);
      nums[c] = n;
    }
    const lat = Number(get("위도"));
    const lng = Number(get("경도"));
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < 33 ||
      lat > 39 ||
      lng < 124 ||
      lng > 132
    ) {
      return fail("위도·경도가 국내 범위를 벗어났어요");
    }

    const closed = parseClosedDays(get("휴무요일"));
    if (closed === null) return fail(`'휴무요일' 값을 읽을 수 없어요: '${get("휴무요일")}'`);

    const hours = parseHours(get("운영시간"));
    const walkMin = nums["필수보행(분)"] ?? null;
    const indoor = (get("실내여부") || null) as Place["indoor"];
    const benches = (get("벤치충분") || null) as Place["benches"];
    const sheetComfort = get("편안함등급") as Comfort | "";
    const phoneRaw = get("전화");
    const erName = get("최근접응급실");
    const photoUrls = get("사진URL")
      .split(/[\s|]+/)
      .map(upgradePhotoUrl)
      .filter((u): u is string => u !== null);

    seen.add(id);
    places.push({
      id,
      name: get("장소명"),
      type: get("유형") as PlaceType,
      area: get("지역"),
      region: get("권역"),
      mainTheme: (get("주테마") || null) as Theme | null,
      subTheme: (get("부테마") || null) as Theme | null,
      address: get("주소"),
      phoneRaw,
      phones: phoneRaw
        .split("/")
        .map((p) => p.trim())
        .filter(Boolean),
      lat,
      lng,
      wheelchair: (get("휠체어접근") || null) as Place["wheelchair"],
      stairs: (get("계단") || null) as Place["stairs"],
      walkMin,
      stayMin: nums["어르신관람시간(분)"] ?? null,
      indoor,
      benches,
      comfort: sheetComfort || computeComfort(walkMin, indoor, benches),
      toilet: (get("화장실") || null) as Place["toilet"],
      accessibleToilet: (get("장애인화장실") || null) as Place["accessibleToilet"],
      dropoffM: nums["하차~입구(m)"] ?? null,
      parking: (get("주차장") || null) as Place["parking"],
      closedRaw: get("휴무요일"),
      closed,
      hoursRaw: get("운영시간"),
      openMin: hours.open,
      closeMin: hours.close,
      standingTable: (get("입식테이블") || null) as Place["standingTable"],
      floor: (get("층/엘리베이터") || null) as Place["floor"],
      er: erName
        ? { name: erName, phone: get("응급실전화"), driveMin: nums["응급실이동(분)"] ?? null }
        : null,
      pharmacy: get("최근접약국") || null,
      verify: (get("확인상태") || "미확인") as VerifyStatus,
      verifiedAt: get("확인일").slice(0, 10),
      verifiedBy: get("확인자"),
      photoUrl: photoUrls[0] ?? null,
      photoUrls,
      note: get("비고"),
    });
  });

  return { places, skipped, missingColumns: [] };
}

/** S1 ③ '모담팀이 직접 확인한 목포 N곳' — 확인상태가 현장·전화인 장소 수 (F-02) */
export function countVerified(places: Place[]): number {
  return places.filter((p) => p.verify === "현장" || p.verify === "전화").length;
}

export function isTourApiPhoto(url: string | null): boolean {
  return !!url && /visitkorea\.or\.kr/i.test(url);
}
