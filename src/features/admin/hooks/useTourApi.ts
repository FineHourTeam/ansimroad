// 한국관광공사 TourAPI 훅: 장소명 검색(쿼리) · 상세를 조사표 칸으로(뮤테이션)
import { useMutation, useQuery } from "@tanstack/react-query";
import { searchTour, tourToRecord } from "../api/tourapi";

export type { TourItem } from "../api/tourapi";

/** search 가 null 이면 아직 검색 전 */
export function useTourSearch(search: { keyword: string; onlyMokpo: boolean } | null) {
  return useQuery({
    queryKey: ["tourapi", "search", search?.keyword, search?.onlyMokpo],
    queryFn: () => (search ? searchTour(search.keyword, search.onlyMokpo) : []),
    enabled: search !== null,
    retry: false, // 서비스 키 오류는 다시 불러도 같다 — 다시 찾기 버튼으로
    staleTime: 5 * 60_000,
  });
}

export function useTourRecord() {
  return useMutation({ mutationFn: tourToRecord });
}
