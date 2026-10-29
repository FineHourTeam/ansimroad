// 추억 페이지 칸 · 여행 완료: 장소마다 별점(+한 줄 · 나만 보기) → 리포트 만들기. 공개 후기는 리포트 · 다른 가족에게도 보인다.
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { StarIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCompleteTrip, useSaveReview } from "@/features/trip";
import type { PlaceReview, TripSnapshot } from "@/shared/domain/types";
import { track } from "@/shared/lib/analytics";
import { now } from "@/shared/lib/clock";

interface Rate {
  rating: number;
  text: string;
  priv: boolean;
}
const EMPTY: Rate = { rating: 0, text: "", priv: false };

function PlaceRate({
  placeId,
  name,
  rate,
  onChange,
}: {
  placeId: string;
  name: string;
  rate: Rate;
  onChange: (next: Partial<Rate>) => void;
}) {
  return (
    <li className="flex flex-col gap-2 border-b pb-3 last:border-b-0">
      <p className="text-base font-bold">{name}</p>
      <ToggleGroup
        type="single"
        spacing={0}
        aria-label={`${name} 별점`}
        value={rate.rating > 0 ? String(rate.rating) : ""}
        onValueChange={(v) => {
          if (v) onChange({ rating: Number(v) });
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <ToggleGroupItem
            key={n}
            value={String(n)}
            aria-label={`${String(n)}점`}
            // 고른 별 하나만 회색 칸이 되지 않게: 채운 별 색으로만 보여 준다
            className="size-12 data-[state=on]:bg-transparent"
          >
            <StarIcon
              fill={n <= rate.rating ? "currentColor" : "none"}
              className={cn("size-8", n <= rate.rating ? "text-warning" : "text-muted-foreground")}
            />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {rate.rating > 0 && (
        <>
          <Label htmlFor={`review-${placeId}`} className="sr-only">
            {name} 한 줄 후기
          </Label>
          <Input
            id={`review-${placeId}`}
            className="h-12 text-base"
            placeholder="한 줄 후기 (선택)"
            maxLength={100}
            value={rate.text}
            onChange={(e) => {
              onChange({ text: e.target.value });
            }}
          />
          <Label htmlFor={`priv-${placeId}`} className="min-h-12 text-base">
            <Checkbox
              id={`priv-${placeId}`}
              checked={rate.priv}
              onCheckedChange={(c) => {
                onChange({ priv: c === true });
              }}
            />
            <span className="sr-only">{name}</span>
            나만 보기
            <span className="text-muted-foreground text-sm font-normal">
              {rate.priv
                ? "(리포트 · 다른 가족에게 안 보여요)"
                : "(리포트 · 다른 가족에게도 보여요)"}
            </span>
          </Label>
        </>
      )}
    </li>
  );
}

function CompleteSheet({
  trip,
  initial,
}: {
  trip: TripSnapshot;
  initial: Record<string, PlaceReview>;
}) {
  const navigate = useNavigate();
  const save = useSaveReview(trip.tripId);
  const complete = useCompleteTrip(trip.tripId);
  const [busy, setBusy] = useState(false);
  const [rates, setRates] = useState<Record<string, Rate>>(() =>
    Object.fromEntries(
      Object.entries(initial).map(([id, r]) => [
        id,
        { rating: r.rating, text: r.text, priv: r.priv },
      ]),
    ),
  );
  const set = (id: string, v: Partial<Rate>) => {
    setRates((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY), ...v } }));
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const at = now().toISOString();
      for (const s of trip.course.stops) {
        const r = rates[s.place.id];
        if (!r || r.rating === 0) continue;
        await save.mutateAsync({
          placeId: s.place.id,
          review: { rating: r.rating, text: r.text.trim(), priv: r.priv, at },
        });
      }
      const reportToken = await complete.mutateAsync();
      track("trip_complete");
      void navigate(paths.report(reportToken));
    } catch {
      setBusy(false);
      toast.error("리포트를 만들지 못했어요. 다시 눌러 주세요");
    }
  };

  return (
    <section
      aria-labelledby="complete-title"
      className="bg-card text-card-foreground border-primary/40 flex flex-col gap-3 rounded-2xl border p-5 shadow-sm"
    >
      <h2 id="complete-title" className="text-lg font-bold tracking-tight">
        오늘 다녀온 곳은 어떠셨어요?
      </h2>
      <p className="text-muted-foreground">별점만 눌러도 돼요. 리포트에 함께 담겨요.</p>
      <ol className="flex flex-col gap-3">
        {trip.course.stops.map((s) => (
          <PlaceRate
            key={s.place.id}
            placeId={s.place.id}
            name={s.place.name}
            rate={rates[s.place.id] ?? EMPTY}
            onChange={(v) => {
              set(s.place.id, v);
            }}
          />
        ))}
      </ol>
      <Button size="xl" disabled={busy} aria-busy={busy} onClick={() => void finish()}>
        {busy ? "리포트를 만드는 중…" : "여행 리포트 만들기"}
      </Button>
    </section>
  );
}

/**
 * '추억 페이지' 칸 (링크 카드 바로 아래, 대표 요청 2026-10-29): 안내 + [예시] + [여행 완료].
 * 사진이 없어도 마칠 수 있다. 여행 날 전에는 실수로 마치지 않게 [여행 완료]를 막는다(사진이 먼저 올라왔으면 연다).
 */
export function CompleteTrip({
  trip,
  reviews,
  reviewsReady,
  canComplete,
  example,
}: {
  trip: TripSnapshot;
  reviews: Record<string, PlaceReview>;
  /** 이전 별점을 채워 넣을 수 있게 후기를 다 불러온 뒤에만 연다 */
  reviewsReady: boolean;
  canComplete: boolean;
  /** [예시] 단추 (추억 페이지 예시 대화상자) */
  example: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // 여행 날 전: 막힌 [여행 완료]를 누르거나 올리면 이유를 말풍선으로 (대표 요청 2026-10-29)
  const [hint, setHint] = useState(false);
  const locked = !canComplete;
  if (open) return <CompleteSheet trip={trip} initial={reviews} />;
  return (
    <section
      aria-label="추억 페이지"
      className="bg-card text-card-foreground flex flex-col gap-2 rounded-2xl border p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="font-semibold">여행이 끝나면 추억 페이지를 만들어 드려요</p>
        <div className="flex shrink-0 gap-2">
          {example}
          <TooltipProvider>
            <Tooltip open={locked && hint} onOpenChange={setHint}>
              <TooltipTrigger asChild>
                {/* disabled 는 hover · 클릭을 받지 않아 aria-disabled 로 막는다 */}
                <Button
                  size="xl"
                  className="px-4 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                  disabled={!reviewsReady}
                  aria-disabled={locked || undefined}
                  onClick={(e) => {
                    if (locked) {
                      e.preventDefault(); // 말풍선이 클릭에 닫히지 않게
                      setHint(true);
                      return;
                    }
                    setOpen(true);
                  }}
                >
                  여행 완료
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-sm">여행 날 이후부터 누를 수 있어요</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {canComplete && (
        <p className="text-muted-foreground text-sm">
          사진이 없어도 마칠 수 있어요. 별점을 남기면 여행 리포트와 추억 페이지를 만들어 드려요.
        </p>
      )}
    </section>
  );
}
