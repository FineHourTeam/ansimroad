// 만든 추천 코스 목록 (왼쪽 칸): 새 코스 · 공개 여부 · 마지막 저장 시각
import { useAllCurated } from "@/features/curated";
import { AddIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    <aside aria-label="만든 코스" className="flex flex-col gap-2 lg:sticky lg:top-20">
      <Button variant="outline" size="lg" onClick={onNew}>
        <AddIcon size="sm" />새 코스 만들기
      </Button>
      {list.isPending ? (
        <div
          className="flex flex-col gap-2"
          role="status"
          aria-label="코스 목록을 불러오는 중이에요"
        >
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : list.isError ? (
        <div className="flex flex-col items-start gap-2 py-2">
          <p className="text-destructive text-sm">
            코스 목록을 불러오지 못했어요. 인터넷 연결을 확인해 주세요
          </p>
          <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
            다시 불러오기
          </Button>
        </div>
      ) : list.data.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">
          아직 만든 코스가 없어요. 지도에서 장소를 골라 첫 코스를 만들어 보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.data.map((c) => {
            const on = c.id === currentId;
            const at = savedAt(c.updatedAt);
            return (
              <li key={c.id}>
                <Button
                  variant={on ? "secondary" : "outline"}
                  aria-current={on ? "true" : undefined}
                  className="h-auto w-full flex-col items-start gap-1 py-2 text-left whitespace-normal"
                  onClick={() => {
                    onOpen(c);
                  }}
                >
                  <span className="font-semibold">{c.title || "이름 없는 코스"}</span>
                  <span className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
                    장소 {c.stops.length}곳
                    <Badge variant={c.published ? "default" : "outline"}>
                      {c.published ? "공개" : "비공개"}
                    </Badge>
                    {at}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
