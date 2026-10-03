// 당일에도 보면서 바로 고친다: 코스 이름 · 출발 시각 (부모님 화면에 바로 반영, 저장 버튼 없음)
import { useId } from "react";
import { EditIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Course } from "@/shared/domain/types";
import { renameCourse, shiftStart } from "@/shared/lib/courseEdit";
import { hhmm, shortDate } from "@/shared/lib/date";

export function CourseHeader({
  date,
  course,
  onChange,
}: {
  date: string;
  course: Course;
  onChange: (next: Course) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-muted-foreground text-base font-semibold">{shortDate(date)}</p>
      <Label htmlFor={id} className="sr-only">
        코스 이름 (눌러서 고치기)
      </Label>
      <div className="flex w-full max-w-sm items-center gap-1">
        <Input
          id={id}
          key={course.title}
          defaultValue={course.title}
          maxLength={30}
          className="h-12 border-dashed text-center text-xl font-bold md:text-xl"
          onBlur={(e) => {
            const next = renameCourse(course, e.target.value);
            if (next !== course && next.title !== course.title) onChange(next);
            else e.target.value = course.title;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <EditIcon className="text-muted-foreground shrink-0" />
      </div>
    </div>
  );
}

export function StartAdjust({
  course,
  onChange,
}: {
  course: Course;
  onChange: (next: Course) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-lg font-bold">출발 {hhmm(course.startMin)}</p>
        <Button
          variant="outline"
          size="xl"
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
          aria-label="출발 10분 늦추기"
          onClick={() => {
            onChange(shiftStart(course, 10));
          }}
        >
          +10분
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">바꾸면 부모님 화면에도 바로 반영돼요.</p>
    </div>
  );
}
