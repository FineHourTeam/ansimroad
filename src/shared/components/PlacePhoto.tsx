// 장소 사진: 원본 비율 그대로(object-contain), 여러 장이면 옆으로 넘겨 본다. 한국관광공사 사진이면 출처를 단다 (D-07).
import { useEffect, useState } from "react";
import { ImageIcon } from "@/components/icons";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { isTourApiPhoto } from "@/shared/data/placeSchema";

function Frame({ url, alt, square }: { url: string | null; alt: string; square: boolean }) {
  const [failed, setFailed] = useState(false);
  const empty = !url || failed;
  return (
    <div
      className={cn(
        "bg-background-subtle grid w-full place-items-center overflow-hidden rounded-lg",
        square ? "aspect-square" : empty ? "h-20" : "aspect-[4/3]",
      )}
    >
      {url && !failed ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-contain"
          onError={() => {
            setFailed(true);
          }}
        />
      ) : (
        <span className="text-muted-foreground flex flex-col items-center gap-1 text-sm">
          <ImageIcon />
          사진 준비 중
        </span>
      )}
    </div>
  );
}

export function PlacePhoto({
  url,
  urls,
  alt,
  square = false,
  className,
}: {
  url: string | null;
  /** 여러 장이면 옆으로 넘겨 본다 (스와이프) */
  urls?: string[];
  alt: string;
  square?: boolean;
  className?: string;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setIdx(api.selectedScrollSnap());
    };
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const list = urls && urls.length > 0 ? urls : url ? [url] : [];
  const current = list[idx] ?? null;
  return (
    <figure className={cn("m-0", className)}>
      {list.length > 1 ? (
        <Carousel setApi={setApi} className="relative">
          <CarouselContent>
            {list.map((u, i) => (
              <CarouselItem key={u}>
                <Frame
                  url={u}
                  alt={`${alt} ${String(i + 1)}/${String(list.length)}`}
                  square={square}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {/* 버튼으로도 넘긴다 (키보드 · 화면 읽기 사용자) */}
          <CarouselPrevious className="bg-background/90 left-2" />
          <CarouselNext className="bg-background/90 right-2" />
          <span
            aria-hidden="true"
            className="bg-foreground/70 text-background absolute right-2 bottom-2 rounded-full px-2 py-0.5 text-xs font-semibold"
          >
            {idx + 1} / {list.length}
          </span>
        </Carousel>
      ) : (
        <Frame url={current} alt={alt} square={square} />
      )}
      {isTourApiPhoto(current) && (
        <figcaption className="text-muted-foreground mt-1 text-xs">사진: 한국관광공사</figcaption>
      )}
    </figure>
  );
}
