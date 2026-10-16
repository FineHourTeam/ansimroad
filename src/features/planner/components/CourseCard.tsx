// S2 코스: 테마 띠(색 · 아이콘 · 이름) · 장소 사진 넘기기(1/N · 넘기면 아래 동선의 같은 번호가 강조) · 이름 · 설명 두 줄 · 동선 · 시간 · 걷는 시간 · 응급실 · [자세히 보기] [확정하기]
// 카드 틀 없이 흰 바탕에 놓는다 (휴대폰에서는 사진이 화면 좌우 끝까지).
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ClockIcon, HospitalIcon, ImageIcon, LoadingIcon, WalkIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { Course, Stop } from "@/shared/domain/types";
import { hhmm } from "@/shared/lib/date";
import { CourseThemeIcon } from "@/shared/components/CourseThemeIcon";
import { courseTone, themeTitle } from "@/shared/lib/courseTheme";
import { erDisplayName } from "@/shared/lib/format";
import { routeLine } from "../lib/courses";

function Slide({ stop }: { stop: Stop }) {
  const [failed, setFailed] = useState(false);
  const url = failed ? null : stop.place.photoUrl;
  return (
    <div className="bg-background-subtle relative grid aspect-[4/3] w-full place-items-center overflow-hidden">
      {url ? (
        <img
          src={url}
          alt={`${stop.place.name} 사진`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => {
            setFailed(true);
          }}
        />
      ) : (
        <span className="text-muted-foreground flex flex-col items-center gap-2 text-sm font-medium">
          <ImageIcon />
          {stop.place.name} 사진 준비 중
        </span>
      )}
      {isTourApiPhoto(url) && (
        <span className="bg-foreground/55 text-background absolute bottom-3 left-3 rounded-full px-2 py-0.5 text-xs backdrop-blur-sm">
          사진: 한국관광공사
        </span>
      )}
    </div>
  );
}

/** '점심 · 쉬어 가기' 꼬리표 (코스 테마 색) */
export function RoleTag({ role }: { role: Stop["role"] }) {
  const text = role === "lunch" ? "점심" : role === "cafe" ? "쉬어 가기" : null;
  if (!text) return null;
  return (
    <Badge className="bg-course-soft text-course-soft-foreground shrink-0 border-transparent">
      {text}
    </Badge>
  );
}

/** 저절로 넘어가는 간격 (손으로 넘기면 그때부터 다시 잰다) */
const AUTO_MS = 1500;

/** 장소마다 한 장. 1.5초마다 저절로 넘어가고(움직임 줄이기 설정이면 미끄러짐 없이 바로), 넘어가면 onIndex 로 지금 번호를 알린다 */
function Gallery({ stops, onIndex }: { stops: Stop[]; onIndex: (i: number) => void }) {
  const [api, setApi] = useState<CarouselApi>();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const i = api.selectedScrollSnap();
      setIdx(i);
      onIndex(i);
    };
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onIndex]);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!api || stops.length < 2) return;
    const id = setTimeout(() => {
      api.scrollNext(reduce === true); // 움직임 줄이기: 미끄러지지 않고 바로 다음 장
    }, AUTO_MS);
    return () => {
      clearTimeout(id);
    };
  }, [api, idx, reduce, stops.length]);
  return (
    // 휴대폰: 본문 좌우 여백(px-4)을 넘어 화면 끝까지 · PC: 칸 너비에 둥근 모서리
    <Carousel
      setApi={setApi}
      opts={{ loop: true }}
      className="relative -mx-4 sm:mx-0 sm:overflow-hidden sm:rounded-b-2xl"
    >
      <CarouselContent className="ml-0">
        {stops.map((s) => (
          <CarouselItem key={s.place.id} className="pl-0">
            <Slide stop={s} />
          </CarouselItem>
        ))}
      </CarouselContent>
      {/* 버튼으로도 넘긴다 (키보드 · 화면 읽기 사용자) */}
      <CarouselPrevious className="bg-background/90 left-3 shadow-sm" />
      <CarouselNext className="bg-background/90 right-3 shadow-sm" />
      <span
        aria-hidden="true"
        className="bg-foreground/70 text-background absolute right-3 bottom-3 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums backdrop-blur-sm"
      >
        {idx + 1} / {stops.length}
      </span>
    </Carousel>
  );
}

export function CourseCard({
  course,
  desc,
  detailHref,
  curated = false,
  confirm,
  disabled,
  onConfirm,
}: {
  course: Course;
  /** 제목 아래 두 줄 설명 (운영진이 관리자 페이지에서 쓴다) */
  desc?: string;
  detailHref: string;
  curated?: boolean;
  confirm: "idle" | "busy" | "failed";
  disabled: boolean;
  onConfirm: () => void;
}) {
  const titleId = `course-${course.key}`;
  const Heading = curated ? "h3" : "h2"; // 추천 코스는 '모담팀 추천 코스'(h2) 아래에 놓인다
  const [active, setActive] = useState(0);
  const label = themeTitle(course.theme);
  return (
    <article
      aria-labelledby={titleId}
      data-course={courseTone(course.theme)}
      className="border-border flex h-full flex-col gap-4 border-b pb-8 last:border-b-0 sm:border-b-0 sm:pb-0"
    >
      {/* 테마 띠 + 사진: 휴대폰에서는 화면 좌우 끝까지, PC 에서는 둘이 한 덩어리 (띠 위쪽 · 사진 아래쪽만 둥글게) */}
      <div className="flex flex-col">
        <header className="bg-course text-course-foreground -mx-4 flex items-center gap-3 px-4 py-3.5 sm:mx-0 sm:rounded-t-2xl">
          <span className="bg-course-foreground/15 grid size-11 shrink-0 place-items-center rounded-xl">
            <CourseThemeIcon theme={course.theme} size="lg" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Heading
                id={titleId}
                className="text-xl leading-tight font-extrabold tracking-tight text-balance"
              >
                {course.title}
              </Heading>
              {curated && <Badge variant="highlight">운영진 추천</Badge>}
            </div>
            {/* 이름을 바꾼 코스도 테마를 글자로 (색만으로 구분하지 않게) */}
            {label && label !== course.title && <p className="text-sm font-semibold">{label}</p>}
          </div>
        </header>
        <Gallery stops={course.stops} onIndex={setActive} />
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {course.fallbackBadge && (
          <Badge variant="secondary" className="self-start">
            테마 외 장소 포함
          </Badge>
        )}
        {desc && (
          <p className="text-muted-foreground line-clamp-2 text-base leading-relaxed">{desc}</p>
        )}
        {/* 동선: 번호 + 장소 (화면 읽기는 한 줄 문장으로) */}
        <div data-testid="course-route">
          <p className="sr-only">{routeLine(course)}</p>
          <ol aria-hidden="true" className="flex flex-col">
            {course.stops.map((s, i) => (
              <li
                key={s.place.id}
                // 번호 사이를 잇는 세로 점선
                className={cn(
                  "relative flex items-center gap-2.5 py-1 text-base font-semibold",
                  i > 0 &&
                    "before:border-course/30 before:absolute before:bottom-1/2 before:left-3 before:h-full before:-translate-x-1/2 before:border-l-2 before:border-dotted",
                )}
              >
                <span
                  className={cn(
                    "relative grid size-6 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums transition-colors motion-reduce:transition-none",
                    i === active
                      ? "bg-course text-course-foreground"
                      : "bg-course-soft text-course-soft-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn("min-w-0 truncate", i === active && "text-course")}>
                  {s.place.name}
                </span>
                <RoleTag role={s.role} />
              </li>
            ))}
          </ol>
        </div>
        <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-3 text-sm">
          <li className="inline-flex items-center gap-1.5 tabular-nums">
            <ClockIcon size="sm" className="text-course" />
            {hhmm(course.startMin)} ~ {hhmm(course.endMin)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <WalkIcon size="sm" className="text-course" />총 걷는 시간 약 {course.totalWalkMin}분
          </li>
          {course.er && (
            <li className="inline-flex items-center gap-1.5">
              <HospitalIcon size="sm" className="text-emergency" />
              응급실 {erDisplayName(course.er.name)}
              {course.er.driveMin !== null ? ` · 차로 ${String(course.er.driveMin)}분` : ""}
            </li>
          )}
        </ul>
      </div>
      {/* 확정 전 확인 팝업 없음 (확정 뒤에도 코스를 고칠 수 있다) */}
      <div className="flex gap-2">
        <Button variant="outline" size="xl" className="shrink-0" asChild>
          <Link to={detailHref}>자세히 보기</Link>
        </Button>
        <Button
          size="xl"
          className="min-w-0 flex-1"
          disabled={disabled}
          aria-busy={confirm === "busy"}
          onClick={onConfirm}
        >
          {confirm === "busy" && (
            <LoadingIcon className="animate-spin motion-reduce:animate-none" />
          )}
          {confirm === "busy"
            ? "확정하는 중…"
            : confirm === "failed"
              ? "다시 시도하기"
              : "이 코스로 확정하기"}
        </Button>
      </div>
      {confirm === "failed" && (
        <p className="text-destructive text-base font-bold" role="alert">
          확정하지 못했어요. 다시 시도해 주세요.
        </p>
      )}
    </article>
  );
}
