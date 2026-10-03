// 만든 추천 코스 목록 (왼쪽 칸): 새 코스 · 공개 여부 · 마지막 저장 시각
import { useAllCurated } from "@/features/curated";
import { AddIcon, ClockIcon, MapPinIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CuratedCourse } from "@/shared/domain/types";
import { isoToHhmm, koreanMonthDay, toLocalYmd } from "@/shared/lib/date";

function savedAt(iso: string): string | null {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return null;
  return `${koreanMonthDay(toLocalYmd(d))} ${isoToHhmm(iso)} 저장`;
}

export function CourseList({
  currentId,
  onOpen,
  onNew,
}: {
  currentId: string;
  onOpen: (c: CuratedCourse) => void;
  onNew: () => void;
}) {
  const list = useAllCurated();
  return (
    <aside aria-label="만든 코스" className="flex flex-col gap-3 lg:sticky lg:top-24">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-lg font-bold tracking-tight">만든 코스</h2>
        {list.data && (
          <span className="text-muted-foreground text-sm tabular-nums">{list.data.length}개</span>
        )}
      </div>
      <Button variant="outline" size="xl" className="w-full border-dashed" onClick={onNew}>
        <AddIcon />새 코스 만들기
      </Button>
      {list.isPending ? (
        <div
          className="flex flex-col gap-2"
          role="status"
          aria-label="코스 목록을 불러오는 중이에요"
        >
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : list.isError ? (
        <div className="bg-card flex flex-col items-start gap-3 rounded-2xl border p-4">
          <p className="text-destructive text-sm">
            코스 목록을 불러오지 못했어요. 인터넷 연결을 확인해 주세요
          </p>
          <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
            다시 불러오기
          </Button>
        </div>
      ) : list.data.length === 0 ? (
        <p className="text-muted-foreground border-input rounded-2xl border border-dashed p-4 text-sm">
          아직 만든 코스가 없어요. 지도에서 장소를 골라 첫 코스를 만들어 보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.data.map((c) => {
            const on = c.id === currentId;
            const at = savedAt(c.updatedAt);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "bg-card border-border/80 focus-visible:ring-ring/50 flex w-full flex-col gap-2 rounded-2xl border p-4 text-left shadow-sm transition-colors outline-none focus-visible:ring-3",
                    on ? "border-primary ring-primary/15 ring-2" : "hover:border-primary/40",
                  )}
                  onClick={() => {
                    onOpen(c);
                  }}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="leading-snug font-bold">{c.title || "이름 없는 코스"}</span>
                    <Badge variant={c.published ? "default" : "secondary"}>
                      {c.published ? "공개" : "비공개"}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="flex items-center gap-1">
                      <MapPinIcon size="sm" />
                      장소 {c.stops.length}곳
                    </span>
                    {at && (
                      <span className="flex items-center gap-1 tabular-nums">
                        <ClockIcon size="sm" />
                        {at}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
