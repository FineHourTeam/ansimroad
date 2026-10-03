// 한국관광공사에서 가져오기: 장소명으로 검색 → 새 장소로 가져오기 / 지금 장소의 빈 칸 채우기
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { tourIds } from "./placeForm";
import { useTourRecord, useTourSearch, type TourItem } from "../../hooks/useTourApi";
import { ImageIcon, SearchIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlaceRecord } from "@/shared/data/placeRecords";

// 관광공사는 사진이 없으면 빈 문자열을 준다. https 주소만 그린다 (혼합 콘텐츠 · 이상한 주소 차단)
const thumb = (it: TourItem) => {
  const u = ([it.firstimage2, it.firstimage].find(Boolean) ?? "").replace(/^http:/, "https:");
  return u.startsWith("https://") ? u : "";
};

export function TourImport({
  records,
  mode,
  onPick,
}: {
  records: PlaceRecord[];
  /** new = 새 장소로 가져오기, fill = 지금 장소의 빈 칸 채우기 */
  mode: "new" | "fill";
  onPick: (fields: Partial<PlaceRecord>) => void;
}) {
  const ids = useId();
  const [q, setQ] = useState("");
  const [onlyMokpo, setOnlyMokpo] = useState(true);
  const [search, setSearch] = useState<{ keyword: string; onlyMokpo: boolean } | null>(null);
  const result = useTourSearch(search);
  const take = useTourRecord();
  const have = useMemo(() => tourIds(records), [records]);
  const busyId = take.isPending ? take.variables.contentid : null;

  const pick = (it: TourItem) => {
    take.mutate(it, {
      onSuccess: onPick,
      onError: () => toast.error("상세 정보를 가져오지 못했어요. 다시 눌러 주세요"),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const keyword = q.trim();
          if (!keyword) return;
          // 같은 검색어로 다시 누르면 다시 찾는다 (시제품과 같이 — 관광공사 쪽이 바뀌었을 수 있다)
          if (search?.keyword === keyword && search.onlyMokpo === onlyMokpo) void result.refetch();
          else setSearch({ keyword, onlyMokpo });
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${ids}-q`} className="font-semibold">
            관광공사 검색어
          </Label>
          <Input
            id={`${ids}-q`}
            className="h-10 text-base md:text-base"
            placeholder="장소명 (예: 갓바위, 케이블카)"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${ids}-mokpo`}
              checked={onlyMokpo}
              onCheckedChange={(v) => {
                setOnlyMokpo(v === true);
              }}
            />
            <Label htmlFor={`${ids}-mokpo`}>목포만</Label>
          </div>
          <Button type="submit" size="lg" disabled={result.isFetching || !q.trim()}>
            <SearchIcon size="sm" />
            {result.isFetching ? "찾는 중…" : "검색하기"}
          </Button>
        </div>
      </form>

      {result.isFetching && !result.data && (
        <div className="flex flex-col gap-2" role="status" aria-label="관광공사에서 찾는 중">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}
      {result.isError && (
        <div className="flex flex-wrap items-center gap-2" role="alert">
          <p className="text-destructive text-sm">
            {result.error.message || "관광공사 검색에 실패했어요"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void result.refetch();
            }}
          >
            다시 찾기
          </Button>
        </div>
      )}
      {result.data?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          검색 결과가 없어요. 이름을 짧게 바꿔 보세요.
        </p>
      )}
      {result.data && result.data.length > 0 && (
        <ul className="flex max-h-80 flex-col gap-2 overflow-auto" aria-label="관광공사 검색 결과">
          {result.data.map((it) => (
            <li
              key={it.contentid}
              className="bg-background-subtle flex items-center gap-3 rounded-xl p-2"
            >
              {thumb(it) ? (
                <img
                  src={thumb(it)}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="bg-muted h-12 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="bg-muted text-muted-foreground grid h-12 w-16 shrink-0 place-items-center rounded-lg">
                  <ImageIcon size="sm" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <strong className="truncate">{it.title}</strong>
                <span className="text-muted-foreground truncate text-xs">{it.addr1}</span>
              </div>
              {have.has(it.contentid) ? (
                <Badge variant="secondary">이미 있음</Badge>
              ) : (
                <Button
                  variant={mode === "new" ? "outline" : "secondary"}
                  size="sm"
                  disabled={take.isPending}
                  aria-label={`${it.title} ${mode === "new" ? "새 장소로 가져오기" : "빈 칸 채우기"}`}
                  onClick={() => {
                    pick(it);
                  }}
                >
                  {busyId === it.contentid
                    ? "가져오는 중…"
                    : mode === "new"
                      ? "새 장소로 가져오기"
                      : "빈 칸 채우기"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
