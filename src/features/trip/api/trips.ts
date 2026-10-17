// 확정한 여행 저장소. 권한 모델은 firestore.rules 머리말 참고:
// 링크 토큰 → links/{token} → trips/{tripId}/members/{uid}_{role} 로 합류한 뒤 읽고 쓴다.
import { signInAnonymously } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  Timestamp,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { now } from "@/shared/lib/clock";
import { addDays, toLocalYmd } from "@/shared/lib/date";
import { randomToken } from "@/shared/lib/token";
import type {
  Course,
  ReportSnapshot,
  TokenLookup,
  TokenRole,
  TripAccess,
  TripInput,
  TripSnapshot,
} from "@/shared/domain/types";

/** 링크 화면은 로그인 없이 열린다 — 익명 로그인으로 uid만 받는다 (운영진이 이미 로그인했으면 그 계정 그대로) */
export async function ensureSignedIn(): Promise<string> {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

/** Firestore는 undefined 를 받지 않는다 — 확정 당시 값 그대로 깊은 복사하면서 undefined 칸을 지운다 */
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** 여행일 + N일 의 끝(한국 시각 23:59:59)까지 열린다 */
function expiryOf(date: string, days: number) {
  const expiresOn = addDays(date, days);
  return { expiresOn, expiresAt: Timestamp.fromDate(new Date(`${expiresOn}T23:59:59+09:00`)) };
}

function toTrip(tripId: string, d: DocumentData): TripSnapshot {
  return {
    tripId,
    createdAt: String(d.createdAt ?? ""),
    input: d.input as TripInput,
    course: d.course as Course,
    expiresOn: String(d.expiresOn ?? ""),
    memos: (d.memos ?? {}) as Record<string, string>,
    completedAt: typeof d.completedAt === "string" ? d.completedAt : null,
    reportToken: typeof d.reportToken === "string" ? d.reportToken : null,
  };
}

export interface CreatedTrip {
  tripId: string;
  seniorToken: string;
  familyToken: string;
}

/** F-13·F-14: 확정 스냅샷 저장 + 어르신용·자녀용 링크 발급 (한 배치로) */
export async function createTrip(
  input: TripInput,
  course: Course,
  expiryDays: number,
  memos: Record<string, string>,
): Promise<CreatedTrip> {
  const uid = await ensureSignedIn();
  const tripRef = doc(collection(db, "trips"));
  const seniorToken = randomToken(10);
  let familyToken = randomToken(10);
  while (familyToken === seniorToken) familyToken = randomToken(10);
  const { expiresOn, expiresAt } = expiryOf(input.date, expiryDays);
  const batch = writeBatch(db);
  batch.set(tripRef, {
    ownerUid: uid,
    createdAt: now().toISOString(),
    input: plain(input),
    course: plain(course),
    memos: plain(memos),
    expiresOn,
    expiresAt,
  });
  batch.set(doc(db, "trips", tripRef.id, "members", `${uid}_family`), {
    role: "family",
    token: familyToken,
  });
  batch.set(doc(db, "links", seniorToken), { tripId: tripRef.id, role: "senior", expiresAt });
  batch.set(doc(db, "links", familyToken), {
    tripId: tripRef.id,
    role: "family",
    expiresAt,
    seniorToken,
  });
  await batch.commit();
  return { tripId: tripRef.id, seniorToken, familyToken };
}

/** /t · /f · /r 진입: 토큰 확인 → 합류. 역할이 다르면 거부, 만료면 거부 (F-14 · F-23) */
export async function joinTrip(token: string, role: TokenRole): Promise<TokenLookup> {
  if (!/^[A-Za-z0-9]{10,}$/.test(token)) return { ok: false, reason: "not_found" };
  const uid = await ensureSignedIn();
  const link = await getDoc(doc(db, "links", token));
  if (!link.exists()) return { ok: false, reason: "not_found" };
  const l = link.data();
  if (l.role !== role) return { ok: false, reason: "wrong_role" };
  const expiresAt = l.expiresAt as Timestamp;
  if (toLocalYmd(now()) > toLocalYmd(expiresAt.toDate()) || Date.now() > expiresAt.toMillis()) {
    return { ok: false, reason: "expired" };
  }
  // 만료 정리(cleanupExpiredTrips)는 여행을 지우고 링크에서 tripId 를 뺀다 → 기기 시계가 늦어도 만료로 본다
  if (typeof l.tripId !== "string") return { ok: false, reason: "expired" };
  const tripId = l.tripId;
  await setDoc(doc(db, "trips", tripId, "members", `${uid}_${role}`), { role, token });
  const access: TripAccess = {
    tripId,
    role,
    token,
    seniorToken: role === "family" ? String(l.seniorToken ?? "") || null : null,
    familyToken: role === "family" ? token : null,
  };
  return { ok: true, access };
}

export async function fetchTrip(tripId: string): Promise<TripSnapshot | null> {
  const snap = await getDoc(doc(db, "trips", tripId));
  return snap.exists() ? toTrip(tripId, snap.data()) : null;
}

/** 코스 수정 · 여행 완료가 어르신 · 자녀 화면에 바로 보이도록 실시간 구독 */
export function subscribeTrip(
  tripId: string,
  onData: (t: TripSnapshot | null) => void,
  onError: (e: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, "trips", tripId),
    (snap) => {
      onData(snap.exists() ? toTrip(tripId, snap.data()) : null);
    },
    onError,
  );
}

const reportDoc = (tripId: string) => doc(db, "trips", tripId, "public", "report");

/** 확정 후 코스 수정 (장소 빼기 · 넣기 · 시간 조정 · 이름 수정). 여행을 마쳤으면 리포트 공개본도 같이 */
export async function updateCourse(
  tripId: string,
  course: Course,
  completed = false,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "trips", tripId), { course: plain(course) });
  if (completed) batch.set(reportDoc(tripId), { course: plain(course) }, { merge: true });
  await batch.commit();
}

function toReport(tripId: string, d: DocumentData): ReportSnapshot {
  return {
    tripId,
    date: String(d.date ?? ""),
    course: d.course as Course,
    expiresOn: String(d.expiresOn ?? ""),
    completedAt: String(d.completedAt ?? ""),
  };
}

/** 리포트 공유 링크(/r)용 공개본 실시간 구독 */
export function subscribeReport(
  tripId: string,
  onData: (r: ReportSnapshot | null) => void,
  onError: (e: Error) => void,
): () => void {
  return onSnapshot(
    reportDoc(tripId),
    (snap) => {
      onData(snap.exists() ? toReport(tripId, snap.data()) : null);
    },
    onError,
  );
}

/** 자녀가 '여행 완료' → 리포트 공유 토큰 발급 (이미 있으면 그대로) */
export async function completeTrip(tripId: string): Promise<string> {
  const existing = async () => {
    const snap = await getDoc(doc(db, "trips", tripId));
    if (!snap.exists()) throw new Error("여행을 찾을 수 없어요");
    const v = snap.get("reportToken") as unknown;
    return { snap, token: typeof v === "string" ? v : null };
  };
  const { snap, token } = await existing();
  if (token) return token;
  const reportToken = randomToken(10);
  const expiresAt = snap.get("expiresAt") as Timestamp;
  const completedAt = now().toISOString();
  const trip = toTrip(tripId, snap.data());
  const batch = writeBatch(db);
  batch.set(doc(db, "trips", tripId), { completedAt, reportToken }, { merge: true });
  batch.set(doc(db, "links", reportToken), { tripId, role: "report", expiresAt });
  // 리포트 링크는 널리 퍼진다 — 보여 줄 값만 공개본으로 (메모 · 나이대 · 이동 불편은 빼고)
  batch.set(reportDoc(tripId), {
    date: trip.input.date,
    course: plain(trip.course),
    expiresOn: trip.expiresOn,
    completedAt,
  });
  try {
    await batch.commit();
    return reportToken;
  } catch (e) {
    // 다른 가족이 같은 때 먼저 완료했으면 그 리포트 토큰을 쓴다
    const again = await existing();
    if (again.token) return again.token;
    throw e;
  }
}

/** D-08: 위치 수집·제공 사실 기록 (위치 ON 일 때만, 좌표 제외) */
export async function recordLocationEvent(
  tripId: string,
  action: "collect" | "provide",
): Promise<void> {
  await addDoc(collection(db, "trips", tripId, "locationLog"), { at: now().toISOString(), action });
}
