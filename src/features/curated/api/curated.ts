// 운영진 추천 코스: curated/{id}. 공개한 코스는 누구나, 전체 목록과 수정은 운영진만 (firestore.rules).
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { CuratedCourse, CuratedStop } from "@/shared/domain/types";
import { randomToken } from "@/shared/lib/token";

const MAX_COURSES = 100;

function toCourse(id: string, d: DocumentData): CuratedCourse {
  return {
    id,
    title: String(d.title ?? ""),
    summary: String(d.summary ?? ""),
    stops: (d.stops ?? []) as CuratedStop[],
    published: d.published === true,
    updatedAt: String(d.updatedAt ?? ""),
  };
}

/** 사용자 화면(S2): 공개한 추천 코스만, 최신순 */
export async function listPublishedCurated(): Promise<CuratedCourse[]> {
  const q = query(
    collection(db, "curated"),
    where("published", "==", true),
    orderBy("updatedAt", "desc"),
    limit(MAX_COURSES),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toCourse(d.id, d.data()));
}

/** 관리자: 공개 여부와 관계없이 전부, 최신순 */
export async function listAllCurated(): Promise<CuratedCourse[]> {
  const snap = await getDocs(
    query(collection(db, "curated"), orderBy("updatedAt", "desc"), limit(MAX_COURSES)),
  );
  return snap.docs.map((d) => toCourse(d.id, d.data()));
}

export function newCuratedId(): string {
  return doc(collection(db, "curated")).id;
}

const photosOf = (stops: CuratedStop[]) => new Set(stops.flatMap((s) => s.photos));

/** 이 코스 폴더(curated/{id}/)에 우리가 올린 사진인지 — 바깥 주소(관광공사 등)는 건드리지 않는다 */
function ownPhoto(courseId: string, url: string): boolean {
  return url.includes(`/o/curated%2F${encodeURIComponent(courseId)}%2F`);
}

/** 사진 파일 지우기 (실패해도 코스 저장 · 삭제는 그대로 — 남은 파일은 다음 정리 때) */
async function removeFiles(urls: string[]): Promise<void> {
  await Promise.allSettled(urls.map((u) => deleteObject(ref(storage, u))));
}

export async function saveCurated(course: CuratedCourse): Promise<void> {
  const { id, ...rest } = course;
  const before = await getDoc(doc(db, "curated", id));
  // undefined 칸(placeId 없는 새 장소 등)은 Firestore 가 받지 않는다
  await setDoc(doc(db, "curated", id), JSON.parse(JSON.stringify(rest)) as DocumentData);
  // 저장한 뒤에야 빠진 사진 파일을 지운다 (저장 전에 지우면 버린 편집에서도 사진이 깨진다)
  if (before.exists()) {
    const kept = photosOf(course.stops);
    const removed = [...photosOf(toCourse(id, before.data()).stops)].filter(
      (u) => !kept.has(u) && ownPhoto(id, u),
    );
    await removeFiles(removed);
  }
}

export async function deleteCurated(id: string): Promise<void> {
  await deleteDoc(doc(db, "curated", id));
  // 코스 폴더의 사진 파일도 함께 (공개 읽기라 남겨 두면 계속 열린다)
  const folder = await listAll(ref(storage, `curated/${id}`)).catch(() => null);
  if (folder) await Promise.allSettled(folder.items.map((item) => deleteObject(item)));
}

/** 추천 코스 장소 사진 올리기 → 공개 주소 */
export async function uploadCuratedPhoto(courseId: string, file: Blob): Promise<string> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileRef = ref(storage, `curated/${courseId}/${randomToken(12)}.${ext}`);
  await uploadBytes(fileRef, file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(fileRef);
}
