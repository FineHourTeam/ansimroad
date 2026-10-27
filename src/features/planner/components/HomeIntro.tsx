// S1 ①~③ 청록 히어로(배경은 장소 사진 슬라이드): 로고 · 한 줄 소개 · 이용 순서 · 장소 정보 안내 (장소 데이터를 못 읽으면 다시 시도)
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { InfoIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { usePlaceData } from "@/features/places";
import { cn } from "@/lib/utils";
import { isTourApiPhoto } from "@/shared/data/placeSchema";

const STEPS = ["조건 입력", "코스 추천", "부모님께 링크"]; // 대표 코스가 붙으면 3개가 아닐 수 있다
const MAX_SLIDES = 6;
const SLIDE_MS = 1500;

/** 배경: 실제 장소 사진을 1.5초마다 바꿔 보여 준다. 글자가 읽히도록 청록 막을 덮는다 (움직임 줄이기 설정이면 서서히 바뀌는 효과 없이 바로 바뀐다) */
function PhotoBackdrop({ slides }: { slides: { url: string; name: string }[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => {
      clearInterval(id);
    };
  }, [slides.length]);
  const current = slides[idx];
  if (!current) return null;
  return (
    <>
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {slides.map((s, i) => (
          <img
            key={s.url}
            src={s.url}
            alt=""
            decoding="async"
            referrerPolicy="no-referrer"
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-700 motion-reduce:transition-none",
              i === idx ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        {/* 아래(글자 쪽)는 진하게, 위는 옅게 덮어 사진이 보이게 한다 */}
        <div className="from-primary via-primary/65 to-primary/10 dark:from-card dark:via-card/75 dark:to-card/30 sm:via-primary/70 sm:to-primary/40 absolute inset-0 bg-linear-to-t" />
      </div>
      <p className="text-primary-foreground/70 dark:text-muted-foreground absolute right-4 bottom-3 text-xs">
        {current.name}
        {isTourApiPhoto(current.url) && " · 사진: 한국관광공사"}
      </p>
    </>
  );
}

export function HomeIntro({
  contactEmail,
  className,
}: {
  contactEmail: string | null;
  className?: string;
}) {
  const placesQ = usePlaceData();
  const slides = (placesQ.data?.places ?? [])
    .flatMap((p) => (p.photoUrl ? [{ url: p.photoUrl, name: p.name }] : []))
    .slice(0, MAX_SLIDES);
  return (
    <header
      className={cn(
        // 다크 모드의 primary 는 밝은 청록이라 흰 로고가 묻힌다 → 카드 색 바탕
        "bg-primary text-primary-foreground dark:bg-card dark:text-card-foreground relative isolate flex min-h-120 flex-col justify-end overflow-hidden rounded-b-3xl px-5 pt-10 pb-7 sm:sticky sm:top-0 sm:h-dvh sm:justify-center sm:rounded-none sm:px-8",
        className,
      )}
    >
      <PhotoBackdrop slides={slides} />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 sm:max-w-sm sm:gap-8">
        <h1>
          <BrandLogo height={34} tone="white" />
        </h1>
        {/* 슬로건 (모담 확정 문구 2026-10-16) */}
        <div className="flex flex-col gap-2">
          <p className="text-2xl leading-snug font-extrabold tracking-tight text-balance sm:text-3xl">
            부모님 여행은 편안하게,
            <br /> 자녀의 마음은 안심하게
          </p>
          <p className="text-primary-foreground/85 dark:text-muted-foreground text-base leading-snug font-medium text-balance break-keep">
            걷는 시간과 계단까지 따진 목포 하루 코스, 여행 날 소식은 사진으로
          </p>
        </div>
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
        {/* ③ 장소 정보 안내 한 줄 (모담 요청 2026-10-27: 확인을 마칠 때까지 '직접 확인' 문구 · 확인한 장소 수 없이). 데이터를 못 읽으면 안내 + 팀 연락처 */}
        <div className="border-primary-foreground/25 dark:border-border min-h-16 border-t pt-5">
          {!(placesQ.isError && !placesQ.data) && (
            <p className="flex items-start gap-3">
              <InfoIcon className="mt-0.5 size-7 shrink-0" />
              <strong className="text-lg leading-snug font-extrabold tracking-tight text-balance break-keep">
                장소마다 걷는 시간·계단·화장실 정보를 함께 보여 드려요
              </strong>
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
