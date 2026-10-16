// 여행 추억 페이지 한 장 (모담 시안 ② 2026-10-16): 크림색 종이 · 항공우편 띠 · 'MOKPO + 날짜' 도장 · 코스 테마 색 ·
// 장소마다 폴라로이드 사진 틀(번호 · 장소명 · 촬영 시각) + 손글씨 멘트. 화면 · A4 인쇄 · 이미지(폭 360px)가 같은 장을 쓴다.
// 폭에 맞춰 칸 수가 바뀐다 (@container: 넓으면 2칸, 이미지용 360px 은 1칸).
import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { CourseThemeIcon } from "@/shared/components/CourseThemeIcon";
import type { Course } from "@/shared/domain/types";
import { courseTone } from "@/shared/lib/courseTheme";
import { hhmm, longDate } from "@/shared/lib/date";
import { stampDate, type MemoryEntry } from "../lib/memories";

const STRIPES = Array.from({ length: 48 }, (_, i) => i);

/** 위 가장자리 항공우편 줄무늬: 코스 색 · 빈칸 · 벽돌색 · 빈칸 */
function AirmailEdge() {
  return (
    <div aria-hidden="true" className="flex h-2.5 overflow-hidden">
      {STRIPES.map((i) => (
        <span
          key={i}
          className={cn(
            "h-full w-6 shrink-0",
            i % 4 === 0 && "bg-course",
            i % 4 === 2 && "bg-emergency",
          )}
        />
      ))}
    </div>
  );
}

function Stamp({ date }: { date: string }) {
  return (
    <div
      aria-hidden="true"
      className="border-course/70 text-course absolute top-0 right-0 flex size-24 rotate-12 flex-col items-center justify-center rounded-full border-2 leading-tight @lg:size-32"
    >
      <span className="text-lg font-black tracking-widest @lg:text-2xl">MOKPO</span>
      <span className="text-xs font-bold tabular-nums @lg:text-sm">{stampDate(date)}</span>
      <span className="text-xs font-bold">안심로드</span>
    </div>
  );
}

function Polaroid({ entry, tilt }: { entry: MemoryEntry; tilt: boolean }) {
  const { stop, photos } = entry;
  const name = stop.place.name;
  return (
    <li
      className={cn(
        "bg-card text-card-foreground relative break-inside-avoid rounded-sm border p-3 pb-5 shadow-sm",
        tilt ? "rotate-1" : "-rotate-1",
      )}
    >
      {/* 사진을 붙인 마스킹테이프 */}
      <span
        aria-hidden="true"
        className="bg-highlight/50 absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-2"
      />
      {photos.length > 0 && (
        <div className={cn("grid gap-1.5", photos.length > 1 && "grid-cols-2")}>
          {photos.map((p, i) => (
            <img
              key={p.id}
              src={p.url}
              alt={`${name}에서 남긴 사진 ${String(i + 1)}`}
              decoding="async"
              referrerPolicy="no-referrer"
              className={cn(
                "bg-background-subtle w-full object-cover",
                // 종이에서는 조금 납작하게: 장소 네 곳이 A4 한 장에 들어가게
                photos.length > 1
                  ? "aspect-3/4 print:aspect-square"
                  : "aspect-4/3 print:aspect-video",
              )}
            />
          ))}
        </div>
      )}
      <div className={cn("flex items-center gap-2", photos.length > 0 && "mt-3")}>
        <span className="bg-course text-course-foreground grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums">
          {entry.index + 1}
        </span>
        <h2 className="min-w-0 flex-1 text-lg leading-snug font-extrabold tracking-tight">
          {name}
        </h2>
        {entry.takenAt && (
          <time className="text-muted-foreground shrink-0 text-sm tabular-nums">
            <span className="sr-only">찍은 시각 </span>
            {entry.takenAt}
          </time>
        )}
      </div>
      {/* 가족이 남긴 멘트를 쓴 그대로, 손글씨 글꼴로 */}
      {entry.text && (
        <p className="font-hand mt-2 text-2xl leading-snug break-words whitespace-pre-wrap">
          {entry.text}
        </p>
      )}
    </li>
  );
}

export function MemoryBook({
  date,
  course,
  entries,
  host,
  className,
  ref,
}: {
  date: string;
  course: Course;
  entries: MemoryEntry[];
  /** 아래 주소 줄 ('ansimroad.web.app') */
  host: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}) {
  return (
    <article
      ref={ref}
      aria-label="여행 추억 페이지"
      data-course={courseTone(course.theme)}
      className={cn(
        "bg-paper text-paper-foreground @container overflow-hidden rounded-2xl border shadow-sm [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:rounded-none print:border-0 print:shadow-none",
        className,
      )}
    >
      <AirmailEdge />
      <div className="flex flex-col gap-8 px-5 pt-6 pb-6 @lg:px-10 @lg:pt-9 print:gap-6">
        <header className="relative flex flex-col gap-3 pr-24 @lg:pr-36">
          <p className="text-course text-xs font-extrabold tracking-widest @lg:text-sm">
            ANSIMROAD · 여행 추억
          </p>
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight @lg:text-5xl">
            목포 여행
          </h1>
          <p className="text-muted-foreground text-base font-semibold tabular-nums @lg:text-lg">
            <span className="whitespace-nowrap">{longDate(date)}</span> ·{" "}
            <span className="whitespace-nowrap">
              {hhmm(course.startMin)} ~ {hhmm(course.endMin)}
            </span>
          </p>
          <p className="bg-course text-course-foreground inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-base font-extrabold">
            <CourseThemeIcon theme={course.theme} />
            {course.title}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            <span className="sr-only">다녀온 순서: </span>
            {course.stops.map((s) => s.place.name).join(" → ")}
          </p>
          <Stamp date={date} />
        </header>

        {entries.length > 0 ? (
          <ol className="grid gap-x-6 gap-y-9 @lg:grid-cols-2 print:gap-y-7">
            {entries.map((e, i) => (
              <Polaroid key={e.stop.place.id} entry={e} tilt={i % 2 === 1} />
            ))}
          </ol>
        ) : (
          <p className="border-input text-muted-foreground rounded-2xl border-2 border-dashed px-4 py-8 text-center text-base">
            아직 올린 사진과 남긴 멘트가 없어요.
            <br />
            여행 현황에서 사진을 올리거나 여행 완료에서 후기를 남겨 주세요.
          </p>
        )}

        <footer className="border-input flex flex-wrap items-center justify-between gap-2 border-t border-dashed pt-4 text-sm">
          <span>
            <strong className="font-extrabold">안심로드</strong>
            <span className="text-muted-foreground"> · 부모님 맞춤 목포 여행</span>
          </span>
          <span className="text-muted-foreground">{host}</span>
        </footer>
      </div>
    </article>
  );
}
