// S2-1 ① 코스 헤더 (카드 틀 없음 · 휴대폰에서는 사진이 화면 좌우 끝까지): 첫 장소 사진 · 코스 이름(수정 중이면 입력칸) · 날짜 · 시간 · 걷는 시간 · [코스 수정]
import { useState } from "react";
import { CalendarIcon, CheckIcon, ClockIcon, EditIcon, WalkIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isTourApiPhoto } from "@/shared/data/placeSchema";
import type { Course } from "@/shared/domain/types";
import { renameCourse } from "@/shared/lib/courseEdit";
import { hhmm, shortDate } from "@/shared/lib/date";

/** 사진을 못 불러오면 통째로 숨긴다 (아래 장소 블록에 같은 사진 자리가 또 있다) */
function Cover({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-2xl">
      <img
        src={url}
        alt=""
        decoding="async"
        referrerPolicy="no-referrer"
        className="bg-background-subtle aspect-video w-full object-cover"
        onError={() => {
          setFailed(true);
        }}
      />
      {isTourApiPhoto(url) && (
        <span className="bg-foreground/60 text-background absolute right-3 bottom-3 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
          사진: 한국관광공사
        </span>
      )}
    </div>
  );
}

export function CourseHeader({
  course,
  date,
  readOnly,
  edit,
  className,
}: {
  course: Course;
  date: string;
  readOnly: boolean;
  /** 확정한 코스만: 수정 켜고 끄기 · 이름 바꾸기 */
  edit?: { editing: boolean; onToggle: () => void; onChange: (next: Course) => void };
  className?: string;
}) {
  const cover = course.stops[0]?.place.photoUrl ?? null;
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      {cover && <Cover key={cover} url={cover} />}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {edit?.editing ? (
            <div className="flex w-full flex-col gap-1.5">
              <Label htmlFor="course-title" className="text-base">
                코스 이름
              </Label>
              <Input
                key={course.title}
                id="course-title"
                defaultValue={course.title}
                maxLength={30}
                className="h-12 text-xl font-extrabold"
                onBlur={(e) => {
                  const next = renameCourse(course, e.target.value);
                  if (next !== course) edit.onChange(next);
                  else e.target.value = course.title;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
            </div>
          ) : (
            <h2 className="text-2xl leading-tight font-extrabold tracking-tight text-balance">
              {course.title}
            </h2>
          )}
          {readOnly && (
            <Badge variant="outline" className="border-success text-success">
              <CheckIcon />
              확정한 코스
            </Badge>
          )}
        </div>
        <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-medium">
          <li className="inline-flex items-center gap-1.5">
            <CalendarIcon size="sm" className="text-primary" />
            {shortDate(date)}
          </li>
          <li className="inline-flex items-center gap-1.5 tabular-nums">
            <ClockIcon size="sm" className="text-primary" />
            {hhmm(course.startMin)} ~ {hhmm(course.endMin)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <WalkIcon size="sm" className="text-primary" />총 걷는 시간 약 {course.totalWalkMin}분
          </li>
        </ul>
        {edit && (
          <Button
            variant={edit.editing ? "default" : "outline"}
            size="xl"
            className="w-full sm:w-fit"
            onClick={edit.onToggle}
          >
            <EditIcon />
            {edit.editing ? "수정 끝내기" : "코스 수정"}
          </Button>
        )}
      </header>
    </section>
  );
}
