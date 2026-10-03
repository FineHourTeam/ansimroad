// 장소 데이터 · 설정값 훅. 앱 전체가 같은 캐시를 쓴다.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePlaceRecord,
  fetchPlaceRecords,
  importPlaceRecords,
  savePlaceRecord,
  uploadPlacePhoto,
} from "../api/places";
import { fetchSettings } from "../api/settings";
import { recordsToPlaces, type PlaceRecord } from "@/shared/data/placeRecords";
import type { PlaceDataset } from "@/shared/domain/types";

export const placeKeys = {
  all: ["places"] as const,
  records: () => ["places", "records"] as const,
  settings: () => ["settings"] as const,
};

export interface PlaceData extends PlaceDataset {
  /** 35칸 원본 (관리자 편집 · CSV 내보내기) */
  records: PlaceRecord[];
}

/** 장소 데이터: 원본 35칸 + 검증을 통과한 Place 목록 + 빠진 행 (시트와 같은 규칙) */
export function usePlaceData() {
  return useQuery({
    queryKey: placeKeys.records(),
    queryFn: async (): Promise<PlaceData> => {
      const records = await fetchPlaceRecords();
      const { places, skipped } = recordsToPlaces(records);
      return { records, places, skipped };
    },
    staleTime: 5 * 60_000,
  });
}

export function useSettings() {
  return useQuery({ queryKey: placeKeys.settings(), queryFn: fetchSettings, staleTime: Infinity });
}

export function useSavePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: savePlaceRecord,
    onSuccess: () => qc.invalidateQueries({ queryKey: placeKeys.all }),
  });
}

export function useDeletePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePlaceRecord,
    onSuccess: () => qc.invalidateQueries({ queryKey: placeKeys.all }),
  });
}

export function useImportPlaces() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: importPlaceRecords,
    onSuccess: () => qc.invalidateQueries({ queryKey: placeKeys.all }),
  });
}

export function useUploadPlacePhoto() {
  return useMutation({
    mutationFn: (v: { placeId: string; file: Blob }) => uploadPlacePhoto(v.placeId, v.file),
  });
}
