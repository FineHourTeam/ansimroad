// 당일에도 보면서 바로 고친다: 코스 이름 · 출발 시각 (부모님 화면에 바로 반영, 저장 버튼 없음)
import { useId } from "react";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { CalendarIcon, ClockIcon, EditIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Course } from "@/shared/domain/types";
import { renameCourse, shiftStart } from "@/shared/lib/courseEdit";
import { hhmm, shortDate } from "@/shared/lib/date";

/** 화면 머리: 날짜 줄(+ 오른쪽 [수정하기] → 코스 보기·수정) + 코스 이름(제목처럼 보이고, 누르면 그 자리에서 고친다) */
export function CourseHeader({
  date,
  course,
  token,
  onChange,
}: {
  date: string;
  course: Course;
  token: string;
  onChange: (next: Course) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm font-semibold tabular-nums">
          <CalendarIcon size="sm" />
          {shortDate(date)} · {hhmm(course.startMin)} ~ {hhmm(course.endMin)}
        </p>
        {/* 누르는 자리는 44px, 위아래 음수 여백으로 날짜 줄 높이는 그대로 */}
        <Button asChild variant="link" className="-my-3 h-11 px-2 text-sm font-bold">
          <Link to={paths.familyCourse(token)}>수정하기</Link>
        </Button>
      </div>
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
