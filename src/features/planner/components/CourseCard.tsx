// S2 코스 카드: 첫 장소 사진 · 이름 · 번호 붙은 동선 · 시간 · 걷는 시간 · 응급실 · [자세히 보기] [확정하기]
import { Link } from "react-router";
import { ClockIcon, HospitalIcon, LoadingIcon, WalkIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PlacePhoto } from "@/shared/components/PlacePhoto";
import type { Course } from "@/shared/domain/types";
import { hhmm } from "@/shared/lib/date";
import { erDisplayName } from "@/shared/lib/format";
import { routeLine } from "../lib/courses";

export function CourseCard({
  course,
  detailHref,
  curated = false,
  confirm,
  disabled,
  onConfirm,
}: {
  course: Course;
  detailHref: string;
  curated?: boolean;
  confirm: "idle" | "busy" | "failed";
  disabled: boolean;
  onConfirm: () => void;
}) {
  const first = course.stops[0]?.place;
  const titleId = `course-${course.key}`;
  const Heading = curated ? "h3" : "h2"; // 추천 코스는 '모담팀 추천 코스'(h2) 아래에 놓인다
  return (
    <Card size="sm" className="h-full">
      <article aria-labelledby={titleId} className="flex h-full flex-col gap-4 px-4">
        <PlacePhoto url={first?.photoUrl ?? null} alt={first ? `${first.name} 사진` : ""} />
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <Heading
              id={titleId}
              className="text-2xl leading-tight font-extrabold tracking-tight text-balance"
            >
              {course.title}
            </Heading>
            {curated && <Badge variant="highlight">운영진 추천</Badge>}
            {course.fallbackBadge && <Badge variant="secondary">테마 외 장소 포함</Badge>}
          </div>
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
                      "before:border-primary/30 before:absolute before:bottom-1/2 before:left-3 before:h-full before:-translate-x-1/2 before:border-l-2 before:border-dotted",
                  )}
                >
                  <span className="bg-accent text-accent-foreground relative grid size-6 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums">
                    {i + 1}
                  </span>
                  <span className="min-w-0 truncate">{s.place.name}</span>
                  {s.role === "lunch" && <Badge variant="secondary">점심</Badge>}
                </li>
              ))}
            </ol>
          </div>
          <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-3 text-sm">
            <li className="inline-flex items-center gap-1.5 tabular-nums">
              <ClockIcon size="sm" className="text-primary" />
              {hhmm(course.startMin)} ~ {hhmm(course.endMin)}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <WalkIcon size="sm" className="text-primary" />총 걷는 시간 약 {course.totalWalkMin}분
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
    </Card>
  );
}
