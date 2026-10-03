// ② 일정: 누를 수 없는 목록 (실수 방지). 지난 장소 '완료', 지금 장소 '지금 여기', 지금 시각은 달력 앱처럼 가로 빨간 선
import { Fragment } from "react";
import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { Course } from "@/shared/domain/types";
import type { NowPos, StopState } from "@/shared/engine/timeline";
import { hhmm } from "@/shared/lib/date";

const STOP_TONE: Record<StopState, string> = {
  done: "border-success bg-success/10",
  now: "border-primary bg-primary/10 ring-2 ring-primary",
  upcoming: "border-border bg-card text-card-foreground",
};

export function SeniorTimeline({
  course,
  memos,
  states,
  nowLine,
  nowLabel,
}: {
  course: Course;
  memos: Record<string, string>;
  states: StopState[];
  nowLine: NowPos | null;
  nowLabel: string;
}) {
  if (course.stops.length === 0) {
    return <p className="text-2xl font-bold">일정이 아직 없어요</p>;
  }
  return (
    <>
      {/* 누를 수 없는 목록이라 길게 눌러도 메뉴가 뜨지 않게 한다 */}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- 목록 점을 지운 ol 은 Safari VoiceOver 가 목록으로 읽지 않는다 */}
      <ol
        role="list"
        className="flex flex-col gap-3 select-none"
        style={{ WebkitTouchCallout: "none" }}
        aria-label="오늘 일정"
      >
        {nowLine?.kind === "before" && nowLine.index === 0 && (
          <li>
            <NowLine label={nowLabel} />
          </li>
        )}
        {course.stops.map((s, i) => {
          const state = states[i] ?? "upcoming";
          const memo = memos[s.place.id];
          const lineHere = nowLine?.kind === "inside" && nowLine.index === i;
          return (
            <Fragment key={s.place.id}>
              {nowLine?.kind === "before" && nowLine.index === i && i > 0 && (
                <li>
                  <NowLine label={nowLabel} moving />
                </li>
              )}
              <li
                className={cn(
                  "relative flex gap-3 rounded-xl border-2 p-4",
                  STOP_TONE[state],
                  // 지금 선 자리: 글자 아래 빈칸 (선 · 시각 표시가 글자를 가로지르지 않게)
                  lineHere && "pb-12",
                )}
                data-state={state}
              >
                {lineHere && <NowLine label={nowLabel} inside />}
                <span className="relative z-10 shrink-0 text-2xl leading-10 font-bold tabular-nums">
                  {hhmm(s.arriveMin)}
                </span>
                <div className="relative z-10 min-w-0 flex-1">
                  <p className="text-3xl leading-10 font-bold">
                    {s.place.name}
                    {s.role === "lunch" ? " (점심)" : ""}
                  </p>
                  {memo && <p className="mt-1 text-2xl leading-relaxed">{memo}</p>}
                  {state === "done" && (
                    <p className="text-success mt-1 flex items-center gap-2 text-2xl font-extrabold">
                      <CheckIcon className="size-6" />
                      완료
                    </p>
                  )}
                  {state === "now" && (
                    <p className="text-primary mt-1 flex items-center gap-2 text-2xl font-extrabold">
                      <span
                        className="bg-primary text-primary-foreground size-3.5 shrink-0 rounded-full"
                        aria-hidden="true"
                      />
                      지금 여기
                    </p>
                  )}
                </div>
              </li>
            </Fragment>
          );
        })}
        {nowLine?.kind === "after" && (
          <li>
            <NowLine label={nowLabel} />
          </li>
        )}
      </ol>
      {course.spare && (
        <div className="bg-background-subtle mt-3 rounded-xl p-4 select-none">
          <p className="text-2xl font-bold">시간 남으면 들를 곳</p>
          <p className="text-3xl leading-10 font-bold">{course.spare.name}</p>
        </div>
      )}
    </>
  );
}

/** 지금 시각 가로 선 (누를 수 없음). inside 면 지금 장소 카드의 아래 빈칸(pb-12)에 그린다:
 *  시각 표시(위아래 1rem)가 글자에 닿지 않는 자리. 시각 표시는 다음 카드에도 가려지지 않게 맨 위(z-20) */
function NowLine({
  label,
  inside = false,
  moving = false,
}: {
  label: string;
  inside?: boolean;
  moving?: boolean;
}) {
  return (
    <div
      data-testid="now-line"
      className={cn(
        "pointer-events-none h-1",
        inside ? "absolute inset-x-0 bottom-5" : "relative my-1",
      )}
    >
      <span
        className="border-now-line absolute inset-x-0 top-0 z-0 border-t-4"
        aria-hidden="true"
      />
      <span
        className="bg-now-line text-now-line-foreground absolute -top-2 -left-2 z-0 size-3.5 rounded-full"
        aria-hidden="true"
      />
      <span className="bg-now-line text-now-line-foreground absolute -top-4 right-2 z-20 rounded-full px-3 text-xl leading-8 font-extrabold whitespace-nowrap">
        지금 {label}
        {moving ? " · 이동 중" : ""}
      </span>
    </div>
  );
}
