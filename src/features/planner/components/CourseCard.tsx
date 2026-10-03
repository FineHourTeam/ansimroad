// S2 코스 카드: 첫 장소 사진 · 이름 · 동선 · 걷는 시간 · 시간 · 응급실 · [자세히 보기] [확정하기]
import { Link } from "react-router";
import { erDisplayName } from "@/shared/lib/format";
import { LoadingIcon, HospitalIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PlacePhoto } from "@/shared/components/PlacePhoto";
import type { Course } from "@/shared/domain/types";
import { hhmm } from "@/shared/lib/date";
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
    <Card className="h-full px-3 sm:px-4">
      <article aria-labelledby={titleId} className="flex h-full flex-col gap-4">
        <PlacePhoto url={first?.photoUrl ?? null} alt={first ? `${first.name} 사진` : ""} />
        <div className="flex flex-1 flex-col gap-2 px-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Heading id={titleId} className="text-xl leading-snug font-extrabold text-balance">
              {course.title}
            </Heading>
            {curated && <Badge>운영진 추천</Badge>}
            {course.fallbackBadge && <Badge variant="secondary">테마 외 장소 포함</Badge>}
          </div>
          <p className="text-base leading-relaxed font-semibold" data-testid="course-route">
            {routeLine(course)}
          </p>
          <ul className="text-muted-foreground flex flex-col gap-0.5 border-t pt-2 text-base">
            <li>총 걷는 시간 약 {course.totalWalkMin}분</li>
            <li>
              {hhmm(course.startMin)} ~ {hhmm(course.endMin)}
              {course.er && (
                <span className="text-foreground inline-flex items-center gap-1 font-semibold">
                  {" · "}
                  <HospitalIcon size="sm" className="text-emergency" />
                  응급실 {erDisplayName(course.er.name)}
                  {course.er.driveMin !== null ? ` 차로 ${String(course.er.driveMin)}분` : ""}
                </span>
              )}
            </li>
          </ul>
        </div>
        {/* 확정 전 확인 팝업 없음 (확정 뒤에도 코스를 고칠 수 있다) */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="xl" className="flex-1 basis-32" asChild>
            <Link to={detailHref}>자세히 보기</Link>
          </Button>
          <Button
            size="xl"
            className={cn("flex-1 basis-40", confirm === "failed" && "font-bold")}
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
          <p className="text-destructive text-base font-bold">
            확정하지 못했어요. 다시 시도해 주세요.
          </p>
        )}
      </article>
    </Card>
  );
}
