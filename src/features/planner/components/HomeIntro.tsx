// S1 ①~③ 청록 히어로: 로고 · 한 줄 소개 · 이용 순서 · 확인한 장소 수 (로딩 중에도 자리를 잡아 둔다)
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SuccessIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaceData } from "@/features/places";
import { cn } from "@/lib/utils";
import { countVerified } from "@/shared/data/placeSchema";

const STEPS = ["조건 입력", "코스 3개", "부모님께 링크"];

export function HomeIntro({
  contactEmail,
  className,
}: {
  contactEmail: string | null;
  className?: string;
}) {
  const placesQ = usePlaceData();
  return (
    <header
      className={cn(
        // 다크 모드의 primary 는 밝은 청록이라 흰 로고가 묻힌다 → 카드 색 바탕
        "bg-primary text-primary-foreground dark:bg-card dark:text-card-foreground rounded-b-3xl px-5 pt-6 pb-7 sm:sticky sm:top-0 sm:flex sm:h-dvh sm:flex-col sm:justify-center sm:rounded-none sm:px-8",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 sm:max-w-sm sm:gap-8">
        <h1>
          <BrandLogo height={34} tone="white" />
        </h1>
        <p className="text-2xl leading-snug font-extrabold tracking-tight text-balance sm:text-3xl">
          자녀가 계획하고,
          <br /> 부모님은 사진만 찍는 목포 여행
        </p>
        <ol aria-label="이용 순서" className="grid grid-cols-3">
          {STEPS.map((t, i) => (
            <li
              key={t}
              // 단계 사이를 잇는 선 (번호 동그라미 뒤로)
              className={cn(
                "relative flex flex-col items-center gap-2 text-center",
                i > 0 &&
                  "before:bg-primary-foreground/35 dark:before:bg-border before:absolute before:top-4 before:right-1/2 before:h-0.5 before:w-full",
              )}
            >
              <span className="bg-primary-foreground text-primary dark:bg-primary dark:text-primary-foreground relative grid size-8 place-items-center rounded-full text-base font-extrabold tabular-nums">
                {i + 1}
              </span>
              <span className="text-sm leading-tight font-semibold">{t}</span>
            </li>
          ))}
        </ol>
        {/* ③ 데이터를 못 읽으면 숫자 대신 안내 + 팀 연락처 */}
        <div className="flex min-h-9 justify-center">
          {placesQ.isPending && (
            <Skeleton className="bg-primary-foreground/25 h-9 w-64 rounded-full" />
          )}
          {placesQ.data && (
            <p className="bg-highlight text-highlight-foreground inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold">
              <SuccessIcon size="sm" className="shrink-0" />
              <span>
                모담팀이 직접 확인한 목포{" "}
                <strong className="text-base font-extrabold tabular-nums">
                  {countVerified(placesQ.data.places)}곳
                </strong>
                으로 만들어요
              </span>
            </p>
          )}
          {placesQ.isError && !placesQ.data && (
            <div
              role="alert"
              className="bg-card text-card-foreground flex w-full flex-col items-center gap-1 rounded-2xl px-4 py-4 text-center text-base"
            >
              <strong className="text-destructive">장소 정보를 불러오지 못했어요</strong>
              <span>잠시 후 다시 시도해 주세요</span>
              {contactEmail && (
                <span>
                  팀 문의{" "}
                  <a className="underline underline-offset-4" href={`mailto:${contactEmail}`}>
                    {contactEmail}
                  </a>
                </span>
              )}
              <Button
                variant="outline"
                size="xl"
                className="mt-2"
                onClick={() => {
                  void placesQ.refetch();
                }}
              >
                다시 시도하기
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
