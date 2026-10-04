// 리포트 히어로: 그날 가장 좋았던 사진(없으면 청록 바다 그러데이션) 위에 날짜 · 코스 이름을 얹는다.
// 사진 위 글자는 라이트 · 다크 모두 흰 글자. 하늘 · 바다 · 흰 건물처럼 밝은 사진에서도 4.5:1 을 넘기도록
// 어둡게 덮는 막을 글자가 있는 곳에만 붙인다: 위 꼬리표는 반투명 알약, 아래 글자 묶음은 글자 높이를 따라가는 막.
// 사진 가운데는 덮지 않아 표지 사진이 살아 있다.
import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/utils";
import type { PhotoRecord } from "@/shared/domain/types";
import { koreanMonthDay } from "@/shared/lib/date";

export function ReportHero({
  date,
  title,
  photo,
}: {
  date: string;
  title: string;
  photo: PhotoRecord | null;
}) {
  return (
    <header
      className={cn(
        "text-primary-foreground dark:text-foreground relative isolate mx-auto flex w-full max-w-xl flex-col overflow-hidden sm:mt-4 sm:rounded-3xl",
        photo
          ? "bg-foreground dark:bg-background text-shadow-foreground/40 dark:text-shadow-background/50 aspect-4/5 text-shadow-sm sm:aspect-4/3"
          : "from-primary to-accent-foreground dark:from-accent dark:to-card min-h-80 bg-linear-to-br",
      )}
    >
      {photo && (
        // 같은 사진이 아래 장소 카드에도 있어 여기서는 장식 (alt="")
        <img
          referrerPolicy="no-referrer"
          src={photo.url}
          alt=""
          decoding="async"
          className="absolute inset-0 -z-10 size-full object-cover"
        />
      )}
      <p
        className={cn(
          "mx-5 mt-5 inline-flex items-center gap-2 self-start rounded-full py-1 pr-3.5 pl-1 text-sm font-bold",
          photo
            ? "bg-foreground/65 dark:bg-background/70 backdrop-blur-md"
            : "bg-primary-foreground/15 dark:bg-foreground/10",
        )}
      >
        <BrandMark size={26} tone="white" alt="" />
        안심로드 여행 리포트
      </p>
      <div
        className={cn(
          "relative mt-auto px-5 pt-2 pb-16",
          photo &&
            "from-foreground/90 to-foreground/65 dark:from-background/95 dark:to-background/75 bg-linear-to-t",
        )}
      >
        {photo && (
          // 글자 묶음 위로 막을 부드럽게 풀어 준다 (자리를 차지하지 않고, 위 꼬리표 아래에 깔린다)
          <div
            aria-hidden="true"
            className="from-foreground/65 via-foreground/25 dark:from-background/75 dark:via-background/30 absolute inset-x-0 bottom-full -z-10 h-32 bg-linear-to-t via-50% to-transparent"
          />
        )}
        <h1 className="flex flex-col gap-1">
          <span className="text-lg font-semibold tabular-nums">{koreanMonthDay(date)} </span>
          <span className="text-4xl leading-tight font-extrabold tracking-tight text-balance">
            {title}
          </span>
        </h1>
        <p className="mt-2 text-base font-medium">부모님과 함께한 목포 하루</p>
      </div>
    </header>
  );
}
