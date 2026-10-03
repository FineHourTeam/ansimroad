// 장소별 후기: 여행 안(trips/{tripId}/reviews/{placeId}) + 공개 모음(placeReviews/{placeId}/items/{tripId}).
// 공개 후기(나만 보기 끔)만 모음에 올라가 운영진 · 다른 가족이 본다. 누가 썼는지는 남기지 않는다.
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlaceReview, PublicReview } from "@/shared/domain/types";

const MAX_PLACE_REVIEWS = 20;

/** 기록 시각: 서버 시각(Timestamp)으로 저장한다. 방금 쓴 값은 추정값, 예전 문자열 값도 받는다 */
function atOf(v: unknown): string {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  return typeof v === "string" ? v : "";
}

function toReview(d: DocumentData): PlaceReview {
  return {
    rating: Number(d.rating),
    text: String(d.text ?? ""),
    priv: d.priv === true,
    at: atOf(d.at),
  };
}

/** 자녀 후기 저장 (null 이면 지움). 공개 여부에 따라 공개 모음에도 넣거나 뺀다 */
export async function saveReview(
  tripId: string,
  placeId: string,
  review: PlaceReview | null,
): Promise<void> {
  const own = doc(db, "trips", tripId, "reviews", placeId);
  const pub = doc(db, "placeReviews", placeId, "items", tripId);
  const batch = writeBatch(db);
  if (review) {
    const clean = {
      rating: Math.round(review.rating),
      text: review.text.trim().slice(0, 200),
      priv: review.priv,
      at: serverTimestamp(), // 규칙: at == request.time (임의 날짜로 최신 후기 자리를 차지하지 못하게)
    };
    batch.set(own, clean);
    if (review.priv) batch.delete(pub);
    else batch.set(pub, { rating: clean.rating, text: clean.text, at: serverTimestamp() });
  } else {
    batch.delete(own);
    batch.delete(pub);
  }
  await batch.commit();
}

/** 여행의 후기 (장소 ID → 후기). 리포트로 열었으면 공개 후기만 읽을 수 있다 */
export function subscribeReviews(
  tripId: string,
  onlyPublic: boolean,
  onData: (reviews: Record<string, PlaceReview>) => void,
  onError: (e: Error) => void,
): () => void {
  const base = collection(db, "trips", tripId, "reviews");
  const q = onlyPublic ? query(base, where("priv", "==", false)) : query(base);
  return onSnapshot(
    q,
    (snap) => {
      onData(
        Object.fromEntries(
          snap.docs.map((d) => [d.id, toReview(d.data({ serverTimestamps: "estimate" }))]),
        ),
      );
    },
    onError,
  );
}

/** 장소의 공개 후기 (최신순) */
export async function listPlaceReviews(placeId: string): Promise<PublicReview[]> {
  const q = query(
    collection(db, "placeReviews", placeId, "items"),
    orderBy("at", "desc"),
    limit(MAX_PLACE_REVIEWS),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const r = d.data();
    return { rating: Number(r.rating), text: String(r.text ?? ""), at: atOf(r.at) };
  });
}
