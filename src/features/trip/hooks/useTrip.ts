// 여행 데이터 훅. 링크 화면(S4 · S5 · S6)은 실시간 구독 결과를 쿼리 캐시에 넣어 쓴다 (rules.md § 상태관리).
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";
import { addPhoto, subscribePhotos } from "../api/photos";
import { listPlaceReviews, saveReview, subscribeReviews } from "../api/reviews";
import {
  completeTrip,
  createTrip,
  fetchTrip,
  joinTrip,
  recordLocationEvent,
  saveMemo,
  subscribeReport,
  subscribeTrip,
  updateCourse,
  updateTripDate,
} from "../api/trips";
import type {
  Course,
  NewPhoto,
  PhotoRecord,
  PlaceReview,
  ReportSnapshot,
  TokenRole,
  TripInput,
  TripSnapshot,
} from "@/shared/domain/types";

export const tripKeys = {
  all: ["trip"] as const,
  access: (role: TokenRole, token: string) => ["trip", "access", role, token] as const,
  doc: (tripId: string) => ["trip", "doc", tripId] as const,
  report: (tripId: string) => ["trip", "report", tripId] as const,
  photos: (tripId: string) => ["trip", "photos", tripId] as const,
  reviews: (tripId: string, onlyPublic: boolean) =>
    ["trip", "reviews", tripId, onlyPublic] as const,
  placeReviews: (placeId: string) => ["placeReviews", placeId] as const,
};

/** 구독이 첫 값을 줄 때까지 기다리는 쿼리 + 이후 변경은 setQueryData 로 반영 */
function useLiveQuery<T>(
  queryKey: QueryKey,
  enabled: boolean,
  subscribe: (onData: (v: T) => void, onError: (e: Error) => void) => () => void,
) {
  const qc = useQueryClient();
  const keyHash = JSON.stringify(queryKey);
  const q = useQuery<T>({
    queryKey,
    enabled,
    staleTime: Infinity,
    queryFn: () =>
      new Promise<T>((resolve, reject) => {
        const off = subscribe(
          (v) => {
            off();
            resolve(v);
          },
          (e) => {
            off();
            reject(e);
          },
        );
      }),
  });
  // Firestore 는 오류가 나면 구독을 끝낸다 — 다시 시도로 오류가 풀리면(isError 변화) 다시 구독한다
  useEffect(() => {
    if (!enabled) return;
    return subscribe(
      (v) => qc.setQueryData(queryKey, v),
      () => void qc.invalidateQueries({ queryKey }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 키 내용이 같으면 다시 구독하지 않는다
  }, [enabled, keyHash, qc, q.isError]);
  return q;
}

/** /t · /f · /r 토큰 확인 + 합류 (한 번만) */
export function useTripAccess(token: string, role: TokenRole) {
  return useQuery({
    queryKey: tripKeys.access(role, token),
    queryFn: () => joinTrip(token, role),
    staleTime: Infinity,
    retry: false,
  });
}

export function useTrip(tripId: string | null) {
  return useLiveQuery<TripSnapshot | null>(
    tripKeys.doc(tripId ?? ""),
    !!tripId,
    (onData, onError) => subscribeTrip(tripId ?? "", onData, onError),
  );
}

/** 한 번만 읽기 (인쇄용 등 실시간이 필요 없는 화면) */
export function useTripOnce(tripId: string | null) {
  return useQuery({
    queryKey: [...tripKeys.doc(tripId ?? ""), "once"],
    queryFn: () => fetchTrip(tripId ?? ""),
    enabled: !!tripId,
  });
}

export function usePhotos(tripId: string | null) {
  return useLiveQuery<PhotoRecord[]>(tripKeys.photos(tripId ?? ""), !!tripId, (onData, onError) =>
    subscribePhotos(tripId ?? "", onData, onError),
  );
}

/** 여행 후기 (장소 ID → 후기). onlyPublic = 리포트 화면 */
export function useReviews(tripId: string | null, onlyPublic: boolean) {
  return useLiveQuery<Record<string, PlaceReview>>(
    tripKeys.reviews(tripId ?? "", onlyPublic),
    !!tripId,
    (onData, onError) => subscribeReviews(tripId ?? "", onlyPublic, onData, onError),
  );
}

export function usePlaceReviews(placeId: string) {
  return useQuery({
    queryKey: tripKeys.placeReviews(placeId),
    queryFn: () => listPlaceReviews(placeId),
  });
}

export function useCreateTrip() {
  return useMutation({
    mutationFn: (v: {
      input: TripInput;
      course: Course;
      expiryDays: number;
      memos: Record<string, string>;
    }) => createTrip(v.input, v.course, v.expiryDays, v.memos),
  });
}

/**
 * 코스 수정. 화면은 실시간 구독(useTrip)이 Firestore 지연 보상으로 바로 바뀌고, 서버가 거절하면 구독이 되돌린다.
 * (쿼리 캐시를 따로 낙관적으로 고치면 연속 수정 중 실패 때 예전 값으로 굳을 수 있어 하지 않는다)
 * 여행을 마친 뒤(completed)면 리포트 공개본의 코스도 같이 바꾼다.
 */
export function useUpdateCourse(tripId: string, completed = false) {
  return useMutation({ mutationFn: (course: Course) => updateCourse(tripId, course, completed) });
}

export function useUpdateTripDate(tripId: string) {
  return useMutation({ mutationFn: (date: string) => updateTripDate(tripId, date) });
}

export function useSaveMemo(tripId: string) {
  return useMutation({
    mutationFn: (v: { placeId: string; text: string }) => saveMemo(tripId, v.placeId, v.text),
  });
}

/** 리포트 공유 링크(/r) 화면: 공개본만 읽는다 (메모 · 조건 제외) */
export function useReportTrip(tripId: string | null) {
  return useLiveQuery<ReportSnapshot | null>(
    tripKeys.report(tripId ?? ""),
    !!tripId,
    (onData, onError) => subscribeReport(tripId ?? "", onData, onError),
  );
}

export function useSaveReview(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { placeId: string; review: PlaceReview | null }) =>
      saveReview(tripId, v.placeId, v.review),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: tripKeys.placeReviews(v.placeId) }),
  });
}

export function useCompleteTrip(tripId: string) {
  return useMutation({ mutationFn: () => completeTrip(tripId) });
}

export function useAddPhoto(tripId: string, by: "family" | "senior") {
  return useMutation({ mutationFn: (photo: NewPhoto) => addPhoto(tripId, by, photo) });
}

export function useRecordLocationEvent(tripId: string) {
  return useMutation({
    mutationFn: (action: "collect" | "provide") => recordLocationEvent(tripId, action),
  });
}
