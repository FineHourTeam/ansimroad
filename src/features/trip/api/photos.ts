// 여행 사진: 파일은 Storage trips/{tripId}/photos/{photoId}.jpg, 메타는 trips/{tripId}/photos/{photoId}
// 파일은 기기에서 EXIF를 지우고 줄인 JPEG (lib/image.ts). 표시는 업로드 때 받은 다운로드 주소로.
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { NewPhoto, PhotoRecord } from "@/shared/domain/types";

const MAX_PHOTOS = 300; // 하루 여행 사진 상한 (목록 조회 limit)

function toPhoto(tripId: string, id: string, d: DocumentData): PhotoRecord {
  return {
    id,
    tripId,
    takenAt: String(d.takenAt ?? ""),
    url: String(d.url ?? ""),
    width: Number(d.width ?? 0),
    height: Number(d.height ?? 0),
    lat: typeof d.lat === "number" ? d.lat : null,
    lng: typeof d.lng === "number" ? d.lng : null,
    locationStatus: (d.locationStatus ?? "off") as PhotoRecord["locationStatus"],
    ...(typeof d.stopIndex === "number" ? { stopIndex: d.stopIndex } : {}),
    ...(typeof d.placeId === "string" ? { placeId: d.placeId } : {}),
    by: d.by === "family" ? "family" : "senior",
  };
}

/** F-17: 어르신 또는 자녀가 사진을 올린다 */
export async function addPhoto(
  tripId: string,
  by: "family" | "senior",
  photo: NewPhoto,
): Promise<PhotoRecord> {
  const metaRef = doc(collection(db, "trips", tripId, "photos"));
  const fileRef = ref(storage, `trips/${tripId}/photos/${metaRef.id}.jpg`);
  await uploadBytes(fileRef, photo.blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(fileRef);
  const meta = {
    takenAt: photo.takenAt,
    url,
    width: Math.round(photo.width),
    height: Math.round(photo.height),
    lat: photo.lat,
    lng: photo.lng,
    locationStatus: photo.locationStatus,
    ...(photo.stopIndex !== undefined ? { stopIndex: photo.stopIndex } : {}),
    ...(photo.placeId !== undefined ? { placeId: photo.placeId } : {}),
    by,
  };
  await setDoc(metaRef, meta);
  return toPhoto(tripId, metaRef.id, meta);
}

/** 새 사진이 바로 보이도록 실시간 구독 (찍은 시각 순) */
export function subscribePhotos(
  tripId: string,
  onData: (list: PhotoRecord[]) => void,
  onError: (e: Error) => void,
): () => void {
  const q = query(collection(db, "trips", tripId, "photos"), orderBy("takenAt"), limit(MAX_PHOTOS));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => toPhoto(tripId, d.id, d.data())));
    },
    onError,
  );
}
