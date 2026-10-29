// 당일에도 보면서 바로 고친다: 여행 날짜 · 출발 시각 · 코스 이름 (부모님 화면에 바로 반영, 저장 버튼 없음)
import { useId, type ComponentProps, type ReactNode } from "react";
import { toast } from "sonner";
import { CalendarIcon, ClockIcon, EditIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Course } from "@/shared/domain/types";
import { renameCourse, shiftStart } from "@/shared/lib/courseEdit";
import { addDays, hhmm, koreanMonthDay, parseHhmm, shortDate } from "@/shared/lib/date";

/** 글자처럼 보이는 날짜 · 시각: 누르면 기기 달력 · 시계가 열린다 (위에 투명한 입력칸) */
function PickText({
  icon,
  text,
  ...input
}: { icon: ReactNode; text: string } & ComponentProps<typeof Input>) {
  return (
    // 누르는 자리는 44px, 위아래 음수 여백으로 날짜 줄 높이는 그대로
    <span className="hover:text-primary focus-within:text-primary relative -my-3 inline-flex min-h-11 items-center gap-1.5">
      {icon}
      <span className="decoration-border underline decoration-dashed underline-offset-4">
        {text}
      </span>
      <Input
        {...input}
        className="absolute inset-0 h-full cursor-pointer opacity-0"
        onClick={(e) => {
          // PC 브라우저는 칸을 눌러도 달력이 안 열려서 직접 연다
          try {
            e.currentTarget.showPicker();
          } catch {
            // 이미 열려 있거나 지원하지 않는 브라우저 — 기본 동작 그대로
          }
        }}
      />
    </span>
  );
}

/**
 * 화면 머리: 날짜 줄(날짜 · 출발 시각을 눌러 바로 고친다) + 코스 이름(제목처럼 보이고, 누르면 그 자리에서 고친다).
 * 날짜는 오늘부터 보관 기한 7일 전까지 — 링크 만료(보관 기한)는 그대로라서, 여행 뒤 사진 볼 날을 남긴다.
 */
export function CourseHeader({
  date,
  today,
  expiresOn,
  course,
  onChange,
  onDate,
}: {
  date: string;
  today: string;
  expiresOn: string;
  course: Course;
  onChange: (next: Course) => void;
  /** 없으면 날짜는 글자만 (여행을 마치면 리포트 날짜와 어긋나지 않게 못 바꾼다) */
  onDate?: (date: string) => void;
}) {
  const id = useId();
  const lastDay = addDays(expiresOn, -7);
  const canDate = !!onDate && today <= lastDay;
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-sm font-semibold tabular-nums">
        {canDate ? (
          <PickText
            icon={<CalendarIcon size="sm" />}
            text={shortDate(date)}
            type="date"
            aria-label={`여행 날짜 ${koreanMonthDay(date)} (눌러서 바꾸기)`}
            min={today}
            max={lastDay}
            value={date}
            onChange={(e) => {
              const v = e.target.value;
              if (!v || v === date) return;
              if (v < today || v > lastDay) {
                toast.error(
                  `${koreanMonthDay(today)}부터 ${koreanMonthDay(lastDay)}까지 고를 수 있어요`,
                );
                return;
              }
              onDate(v);
            }}
          />
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon size="sm" />
            {shortDate(date)}
          </span>
        )}
        <span aria-hidden="true">·</span>
        <PickText
          icon={<ClockIcon size="sm" />}
          text={hhmm(course.startMin)}
          type="time"
          aria-label={`출발 시각 ${hhmm(course.startMin)} (눌러서 바꾸기)`}
          min="07:00"
          max="16:00"
          step={600}
          value={hhmm(course.startMin)}
          onChange={(e) => {
            const m = parseHhmm(e.target.value);
            if (m !== null && m !== course.startMin)
              onChange(shiftStart(course, m - course.startMin));
          }}
        />
        <span>~ {hhmm(course.endMin)}</span>
      </p>
      <div className="-mx-2 flex items-center">
        <Input
          id={id}
          key={course.title}
          defaultValue={course.title}
          maxLength={30}
          className="hover:border-input focus-visible:bg-card h-12 border-transparent bg-transparent px-2 text-2xl font-extrabold tracking-tight md:text-2xl dark:bg-transparent"
          onBlur={(e) => {
            const next = renameCourse(course, e.target.value);
            if (next !== course && next.title !== course.title) onChange(next);
            else e.target.value = course.title;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        {/* 연필을 눌러도 이름 칸으로 간다 */}
        <Label
          htmlFor={id}
          className="text-muted-foreground hover:text-primary grid size-11 shrink-0 cursor-pointer place-items-center rounded-full"
        >
          <span className="sr-only">코스 이름 (눌러서 고치기)</span>
          <EditIcon />
        </Label>
      </div>
    </div>
  );
}

/** 출발 시각 ±10분 */
export function StartAdjust({
  course,
  onChange,
}: {
  course: Course;
  onChange: (next: Course) => void;
}) {
  return (
    <section
      aria-label="출발 시각"
      className="bg-card text-card-foreground flex flex-col gap-2 rounded-2xl border px-4 py-3.5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="bg-accent text-primary grid size-10 shrink-0 place-items-center rounded-full">
          <ClockIcon />
        </span>
        <p className="flex-1 text-lg font-extrabold tabular-nums">출발 {hhmm(course.startMin)}</p>
        <Button
          variant="outline"
          size="xl"
          className="px-3"
          aria-label="출발 10분 앞당기기"
          onClick={() => {
            onChange(shiftStart(course, -10));
          }}
        >
          −10분
        </Button>
        <Button
          variant="outline"
          size="xl"
          className="px-3"
          aria-label="출발 10분 늦추기"
          onClick={() => {
            onChange(shiftStart(course, 10));
          }}
        >
          +10분
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">바꾸면 부모님 화면에도 바로 반영돼요.</p>
    </section>
  );
}
