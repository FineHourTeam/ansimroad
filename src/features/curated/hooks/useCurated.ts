import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteCurated,
  listAllCurated,
  listPublishedCurated,
  newCuratedId,
  saveCurated,
  uploadCuratedPhoto,
} from "../api/curated";
import type { CuratedCourse } from "@/shared/domain/types";

export const curatedKeys = {
  all: ["curated"] as const,
  published: () => ["curated", "published"] as const,
  admin: () => ["curated", "admin"] as const,
};

/** S2 · S2-1: 공개한 운영진 추천 코스 */
export function usePublishedCurated() {
  return useQuery({ queryKey: curatedKeys.published(), queryFn: listPublishedCurated });
}

/** 관리자: 전체 */
export function useAllCurated(enabled = true) {
  return useQuery({ queryKey: curatedKeys.admin(), queryFn: listAllCurated, enabled });
}

export function useSaveCurated() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: CuratedCourse) => saveCurated(c),
    onSuccess: () => qc.invalidateQueries({ queryKey: curatedKeys.all }),
  });
}

export function useDeleteCurated() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCurated(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: curatedKeys.all }),
  });
}

export function useUploadCuratedPhoto() {
  return useMutation({
    mutationFn: (v: { courseId: string; file: Blob }) => uploadCuratedPhoto(v.courseId, v.file),
  });
}

export { newCuratedId };
