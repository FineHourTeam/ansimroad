// 리포트 장소 카드: 도착 시각 · 장소 이름 · 공개 후기(별점 + 한 줄) · 그 장소에서 남긴 사진 (최대 3장)
import { StarIcon } from "@/components/icons";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PlacePhoto } from "@/shared/components/PlacePhoto";
import type { PhotoRecord, PlaceReview, Stop } from "@/shared/domain/types";
import { hhmm } from "@/shared/lib/date";

const MAX_PHOTOS = 3;
const STARS = [1, 2, 3, 4, 5] as const;

export function ReportStop({
  index,
  stop,
  review,
  photos,
}: {
  index: number;
  stop: Stop;
  review: PlaceReview | undefined;
  photos: PhotoRecord[];
}) {
  const name = stop.place.name;
  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-2">
          <p className="text-primary flex items-center gap-2 font-bold">
            <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-full text-xs">
              {index + 1}
            </span>
            {hhmm(stop.arriveMin)}
          </p>
          <h2 className="text-lg font-bold">{name}</h2>
          {review && !review.priv && <ReviewLine review={review} />}
          {photos.length > 0 ? (
            <PhotoGrid photos={photos} name={name} />
          ) : (
            stop.place.photoUrl && <PlacePhoto url={stop.place.photoUrl} alt={name} />
          )}
        </CardContent>
      </Card>
    </li>
  );
}

function ReviewLine({ review }: { review: PlaceReview }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base">
      <span
        role="img"
        aria-label={`별점 ${String(review.rating)}점`}
        className="text-primary inline-flex"
      >
        {STARS.map((n) => (
          <StarIcon
            key={n}
            size="sm"
            className={n <= review.rating ? "fill-current" : "text-muted-foreground"}
          />
        ))}
      </span>
      {review.text && <span>“{review.text}”</span>}
    </p>
  );
}

/** 사진은 최대 3장까지 보이고, 더 있으면 마지막 칸에 '+N장'을 얹어 히어로의 사진 수와 맞춘다 */
function PhotoGrid({ photos, name }: { photos: PhotoRecord[]; name: string }) {
  const shown = photos.slice(0, MAX_PHOTOS);
  const n = shown.length;
  const more = photos.length - n;
  return (
    <div
      className={cn(
        "mt-1 grid gap-1.5",
        n === 2 && "grid-cols-2",
        n >= 3 && "grid-cols-3 grid-rows-2",
      )}
    >
      {shown.map((p, i) => {
        const img = (
          <img
            key={p.id}
            src={p.url}
            alt={`${name}에서 남긴 사진 ${String(i + 1)}`}
            loading="lazy"
            decoding="async"
            className={cn(
              "bg-background-subtle size-full rounded-lg object-cover",
              n >= 3 && i === 0 ? "col-span-2 row-span-2" : "aspect-4/3",
            )}
          />
        );
        if (more <= 0 || i !== n - 1) return img;
        return (
          <div key={p.id} className="relative">
            {img}
            <span className="bg-foreground/60 text-background absolute inset-0 grid place-items-center rounded-lg text-lg font-bold">
              +{more}장
            </span>
          </div>
        );
      })}
    </div>
  );
}
