// 장소 데이터 저장소: places/{ID} = 조사표 35칸 한 행. 누구나 읽고, 운영진만 고친다 (firestore.rules).
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { normalizeRecord, type PlaceRecord } from "@/shared/data/placeRecords";
import { randomToken } from "@/shared/lib/token";

const MAX_PLACES = 1000; // 목포 조사 대상 전체가 수백 곳 — 한 번에 읽는 상한
const BATCH = 400; // Firestore 배치 한도(500) 안쪽

/** Firestore 문서 ID 로 못 쓰는 글자('/')가 들어간 ID 는 저장 전에 막는다 */
export function isValidPlaceId(id: string): boolean {
  return /^[^/\s]{1,100}$/.test(id) && id !== "." && id !== "..";
}

export async function fetchPlaceRecords(): Promise<PlaceRecord[]> {
  const snap = await getDocs(query(collection(db, "places"), limit(MAX_PLACES)));
  return snap.docs
    .map((d) => normalizeRecord({ ...d.data(), ID: d.id }))
    .sort((a, b) => a.ID.localeCompare(b.ID));
}

export async function savePlaceRecord(rec: PlaceRecord): Promise<void> {
  if (!isValidPlaceId(rec.ID)) throw new Error("ID에 '/'나 공백은 쓸 수 없어요");
  await setDoc(doc(db, "places", rec.ID), rec);
}

export async function deletePlaceRecord(id: string): Promise<void> {
  await deleteDoc(doc(db, "places", id));
}

/** 여러 곳을 한 번에 넣는다 (TourAPI 가져오기 · CSV 가져오기). 같은 ID 는 덮어쓴다 */
export async function importPlaceRecords(records: PlaceRecord[]): Promise<number> {
  const valid = records.filter((r) => isValidPlaceId(r.ID));
  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = writeBatch(db);
    for (const r of valid.slice(i, i + BATCH)) batch.set(doc(db, "places", r.ID), r);
    await batch.commit();
  }
  return valid.length;
}

/** 장소 사진 올리기 → 공개 주소 (사진URL 칸에 넣는다) */
export async function uploadPlacePhoto(placeId: string, file: Blob): Promise<string> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileRef = ref(storage, `places/${placeId}/${randomToken(12)}.${ext}`);
  await uploadBytes(fileRef, file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(fileRef);
}
