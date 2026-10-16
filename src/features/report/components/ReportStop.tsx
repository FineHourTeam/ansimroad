// 리포트 장소 카드: 번호 · 도착 시각(+ 공개 별점) · 장소 이름 → 그 장소에서 남긴 사진 (최대 3장) → 공개 후기 한 줄 인용
import { useState } from "react";
import { StarIcon } from "@/components/icons";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isTourApiPhoto } from "@/shared/data/placeSchema";
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
  const pub = review && !review.priv ? review : null;
  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-course text-course-foreground grid size-9 shrink-0 place-items-center rounded-full text-base font-bold tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-muted-foreground flex items-center gap-2 text-sm font-semibold tabular-nums">
                {hhmm(stop.arriveMin)} 도착
                {pub && <Stars rating={pub.rating} label={`별점 ${String(pub.rating)}점`} />}
              </p>
              <h2 className="text-lg leading-snug font-bold tracking-tight">{name}</h2>
            </div>
          </div>
          {photos.length > 0 ? (
            <PhotoGrid photos={photos} name={name} />
          ) : (
            stop.place.photoUrl && <FallbackPhoto url={stop.place.photoUrl} alt={name} />
          )}
          {pub?.text && (
            <blockquote className="bg-background-subtle rounded-xl px-4 py-3.5 text-base leading-relaxed font-medium text-pretty">
              “{pub.text}”
            </blockquote>
          )}
        </CardContent>
      </Card>
    </li>
  );
}

/** 별 다섯 개 — 채운 별은 모래빛(로고의 해). rating 은 반올림해서 채운다 */
export function Stars({
  rating,
  label,
  className,
}: {
  rating: number;
  label: string;
  className?: string;
}) {
  const filled = Math.round(rating);
  return (
    <span role="img" aria-label={label} className={cn("inline-flex gap-0.5", className)}>
      {STARS.map((n) => (
        <StarIcon
          key={n}
          size="sm"
          className={n <= filled ? "text-highlight fill-current" : "text-input"}
        />
      ))}
    </span>
  );
}

/**
 * 가족 사진이 없는 장소는 장소 사진(대개 한국관광공사)을 가족 사진 한 장과 같은 4:3 칸에 꽉 채운다 — 앨범 흐름이 끊기지 않게.
 * 못 불러오면 빈 칸 대신 칸을 통째로 뺀다.
 */
function FallbackPhoto({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className="m-0">
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="bg-background-subtle aspect-4/3 w-full rounded-xl object-cover"
        onError={() => {
          setFailed(true);
        }}
      />
      {isTourApiPhoto(url) && (
        <figcaption className="text-muted-foreground mt-1.5 text-xs">사진: 한국관광공사</figcaption>
      )}
    </figure>
  );
}

/** 사진은 최대 3장까지 보이고, 더 있으면 마지막 칸에 '+N장'을 얹어 위 요약의 사진 수와 맞춘다 */
function PhotoGrid({ photos, name }: { photos: PhotoRecord[]; name: string }) {
  const shown = photos.slice(0, MAX_PHOTOS);
  const n = shown.length;
  const more = photos.length - n;
  return (
    <div
      className={cn("grid gap-1.5", n === 2 && "grid-cols-2", n >= 3 && "grid-cols-3 grid-rows-2")}
    >
      {shown.map((p, i) => {
        const img = (
          <img
            key={p.id}
            referrerPolicy="no-referrer"
            src={p.url}
            alt={`${name}에서 남긴 사진 ${String(i + 1)}`}
            loading="lazy"
            decoding="async"
            className={cn(
              "bg-background-subtle size-full rounded-xl object-cover",
              n === 1 && "aspect-4/3",
              n === 2 && "aspect-square",
              n >= 3 && (i === 0 ? "col-span-2 row-span-2" : "aspect-square"),
            )}
          />
        );
        if (more <= 0 || i !== n - 1) return img;
        return (
          <div key={p.id} className="relative">
            {img}
            <span className="bg-foreground/55 text-background absolute inset-0 grid place-items-center rounded-xl text-lg font-bold">
              +{more}장
            </span>
          </div>
        );
      })}
    </div>
  );
}
