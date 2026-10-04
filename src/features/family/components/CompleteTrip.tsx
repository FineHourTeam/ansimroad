// 여행 완료: 장소마다 별점(+한 줄 · 나만 보기) → 리포트 만들기. 공개 후기는 리포트 · 다른 가족에게도 보인다.
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { StarIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

export function CompleteTrip({
  trip,
  reviews,
  reviewsReady,
}: {
  trip: TripSnapshot;
  reviews: Record<string, PlaceReview>;
  /** 이전 별점을 채워 넣을 수 있게 후기를 다 불러온 뒤에만 연다 */
  reviewsReady: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (open) return <CompleteSheet trip={trip} initial={reviews} />;
  return (
    <section
      aria-label="여행 마치기"
      className="bg-card text-card-foreground flex flex-col gap-3 rounded-2xl border p-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="bg-highlight text-highlight-foreground grid size-11 shrink-0 place-items-center rounded-full">
          <StarIcon fill="currentColor" />
        </span>
        <div className="flex flex-col">
          <p className="text-lg font-bold tracking-tight">여행을 마치셨나요?</p>
          <p className="text-muted-foreground text-sm">
            별점을 남기면 사진을 모아 여행 리포트를 만들어 드려요.
          </p>
        </div>
      </div>
      <Button
        size="xl"
        className="w-full"
        disabled={!reviewsReady}
        onClick={() => {
          setOpen(true);
        }}
      >
        여행 완료
      </Button>
    </section>
  );
}
