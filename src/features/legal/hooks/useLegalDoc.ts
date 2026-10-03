import { useQuery } from "@tanstack/react-query";
import { fetchContent } from "../api/content";

export const legalKeys = {
  doc: (file: string) => ["legal", file] as const,
};

export function useLegalDoc(file: string) {
  return useQuery({
    queryKey: legalKeys.doc(file),
    queryFn: () => fetchContent(file),
    staleTime: 10 * 60_000,
  });
}
