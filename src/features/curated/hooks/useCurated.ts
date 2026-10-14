import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteCurated,
  listAllCurated,
  listPublishedCurated,
  newCuratedId,
  saveCurated,
  uploadCuratedPhoto,
} from "../api/curated";
import { getCourseTexts, saveCourseTexts, type CourseTexts } from "../api/courseTexts";
import type { CuratedCourse } from "@/shared/domain/types";

export const curatedKeys = {
  all: ["curated"] as const,
  published: () => ["curated", "published"] as const,
  admin: () => ["curated", "admin"] as const,
  texts: () => ["curated", "texts"] as const,
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

/** S2 카드 · 관리자: 자동 코스(바다 · 역사 · 자연 · 대표)별 설명 */
export function useCourseTexts() {
  return useQuery({ queryKey: curatedKeys.texts(), queryFn: getCourseTexts });
}

export function useSaveCourseTexts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (t: CourseTexts) => saveCourseTexts(t),
    onSuccess: () => qc.invalidateQueries({ queryKey: curatedKeys.texts() }),
  });
}
