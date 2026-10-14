// 입력값 보존(F-03)과 결과 주소(F-12: 새로고침해도 같은 결과).
// 결과 주소 예: /result?p=2&a=70&m=stairs&w=20&d=2026-10-18&s=600&t=transit&ex=A0018,A0023
import { isValidYmd } from "@/shared/lib/date";
import { START_VALUES } from "@/shared/lib/format";
import type {
  AgeBand,
  Mobility,
  Party,
  StartMin,
  Transport,
  TripInput,
  TripInputDraft,
  WalkLimit,
} from "@/shared/domain/types";

const DRAFT_KEY = "sr.draft.v1";

export const EMPTY_DRAFT: TripInputDraft = {
  party: null,
  age: null,
  mobility: null,
  walk: null,
  date: null,
  start: 600, // 기본 오전 10시 (고르지 않아도 된다)
  transport: null,
};

export function isComplete(d: TripInputDraft): d is TripInput {
  return Object.values(d).every((v) => v !== null);
}

/** 첫 미입력 항목 (S1 상태·예외: 그 항목으로 스크롤·강조) */
export const FIELD_ORDER: (keyof TripInput)[] = [
  "party",
  "age",
  "mobility",
  "walk",
  "date",
  "transport",
];
export function firstMissing(d: TripInputDraft): keyof TripInput | null {
  return FIELD_ORDER.find((k) => d[k] === null) ?? null;
}

export function encodeQuery(input: TripInput, excluded: string[] = []): string {
  const q = new URLSearchParams({
    p: String(input.party),
    a: String(input.age),
    m: input.mobility,
    w: String(input.walk),
    d: input.date,
    s: String(input.start ?? 600),
    t: input.transport,
  });
  if (excluded.length > 0) q.set("ex", [...new Set(excluded)].sort().join(","));
  return q.toString();
}

const pick = <T>(v: string | null, allowed: readonly T[], map: (s: string) => T): T | null => {
  if (v === null) return null;
  const x = map(v);
  return allowed.includes(x) ? x : null;
};

export function decodeQuery(search: string): { input: TripInput | null; excluded: string[] } {
  const q = new URLSearchParams(search);
  const draft: TripInputDraft = {
    party: pick<Party>(q.get("p"), [1, 2, 3], Number as (s: string) => Party),
    age: pick<AgeBand>(q.get("a"), [40, 50, 60, 70, 80], Number as (s: string) => AgeBand),
    mobility: pick<Mobility>(q.get("m"), ["none", "stairs", "wheelchair"], (s) => s as Mobility),
    walk: pick<WalkLimit>(q.get("w"), [10, 20, 30], Number as (s: string) => WalkLimit),
    date: (() => {
      const d = q.get("d");
      return d && isValidYmd(d) ? d : null;
    })(),
    // 이 칸이 생기기 전 주소(s 없음)는 10:00 으로 읽는다
    start: pick<StartMin>(q.get("s"), START_VALUES, Number) ?? 600,
    transport: pick<Transport>(q.get("t"), ["car", "transit"], (s) => s as Transport),
  };
  const excluded = (q.get("ex") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { input: isComplete(draft) ? draft : null, excluded };
}

export function saveDraft(d: TripInputDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* 무시 */
  }
}

export function loadDraft(): TripInputDraft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<TripInputDraft>) };
  } catch {
    /* 무시 */
  }
  return { ...EMPTY_DRAFT };
}
