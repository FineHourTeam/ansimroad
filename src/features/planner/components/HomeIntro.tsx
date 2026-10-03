// S1 ①~③ 소개 블록: 이름 · 한 줄 소개 · 이용 순서 · 확인한 장소 수 (로딩 중에도 자리를 잡아 둔다)
import { ChevronRightIcon, SuccessIcon } from "@/components/icons";
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
        "bg-primary/5 border-b px-4 py-5 text-center sm:sticky sm:top-0 sm:flex sm:h-dvh sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0 sm:px-8 sm:py-10",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 sm:my-auto sm:max-w-sm sm:gap-6">
        <h1 className="text-primary inline-flex items-center gap-2 text-3xl font-extrabold sm:text-4xl">
          <img src="/favicon.svg" alt="" className="size-8 sm:size-10" />
          안심로드
        </h1>
        <p className="text-lg leading-snug font-semibold text-balance sm:text-2xl">
          자녀가 계획하고,
          <br /> 부모님은 사진만 찍는 목포 여행
        </p>
        <ol
          aria-label="이용 순서"
          className="grid w-full grid-cols-3 gap-4 sm:grid-cols-1 sm:gap-2"
        >
          {STEPS.map((t, i) => (
            <li
              key={t}
              className="bg-background relative flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-base font-bold sm:flex-row sm:gap-3 sm:px-4 sm:py-3"
            >
              {/* 단계 사이 흐름 표시 (세로로 쌓이는 넓은 화면에서는 숨김) */}
              {i > 0 && (
                <ChevronRightIcon
                  size="sm"
                  className="text-primary absolute top-1/2 -left-2 -translate-x-1/2 -translate-y-1/2 sm:hidden"
                />
              )}
              <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-full text-sm font-extrabold">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        {/* ③ 데이터를 못 읽으면 숫자 대신 안내 + 팀 연락처 */}
        <div className="flex min-h-7 w-full justify-center">
          {placesQ.isPending && <Skeleton className="h-7 w-60" />}
          {placesQ.data && (
            <p className="text-primary inline-flex items-center gap-1.5 text-base font-bold">
              <SuccessIcon className="text-success" />
              <span>
                모담팀이 직접 확인한 목포{" "}
                <strong className="text-lg font-extrabold">
                  {countVerified(placesQ.data.places)}곳
                </strong>
                으로 만들어요
              </span>
            </p>
          )}
          {placesQ.isError && !placesQ.data && (
            <div
              role="alert"
              className="border-destructive/30 bg-background flex flex-col items-center gap-1 rounded-md border px-4 py-3 text-base"
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
                className="mt-1"
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
