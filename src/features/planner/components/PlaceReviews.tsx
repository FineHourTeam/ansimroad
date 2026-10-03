// 다녀온 가족들의 공개 후기: 평균 별점(모래빛 별 다섯 개) + 최근 한 줄 2개
import { StarIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaceReviews } from "@/features/trip";
import { averageRating } from "../lib/courses";

export function PlaceReviews({ placeId }: { placeId: string }) {
  const q = usePlaceReviews(placeId);
  if (q.isPending) return <Skeleton className="h-6 w-48" />;
  if (q.isError) {
    return (
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-sm">
        다녀온 가족 후기를 불러오지 못했어요
        <Button
          variant="link"
          size="xl"
          className="px-0 text-sm"
          onClick={() => {
            void q.refetch();
          }}
        >
          다시 불러오기
        </Button>
      </p>
    );
  }
  const avg = averageRating(q.data);
  if (avg === null) {
    return (
      <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
        <StarIcon size="sm" className="shrink-0" />
        아직 다녀온 가족의 후기가 없어요
      </p>
    );
  }
  const filled = Math.round(Number(avg));
  return (
    <div className="border-border/80 flex flex-col gap-1.5 rounded-xl border px-3.5 py-3">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-extrabold tabular-nums">
        <span className="inline-flex" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <StarIcon
              key={n}
              size="sm"
              fill="currentColor"
              className={n <= filled ? "text-highlight" : "text-border"}
            />
          ))}
        </span>
        {avg}
        <span className="text-muted-foreground text-sm font-medium">
          · 다녀온 가족 {q.data.length}명
        </span>
      </p>
      {q.data
        .filter((r) => r.text)
        .slice(0, 2)
        .map((r) => (
          <p key={`${r.at}-${r.text}`} className="text-sm leading-relaxed">
            “{r.text}”
          </p>
        ))}
    </div>
  );
}
