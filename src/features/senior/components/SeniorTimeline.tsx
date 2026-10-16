// ② 일정: 누를 수 없는 목록 (실수 방지). 지난 장소 '완료'(차분한 모래빛), 지금 장소 '지금 여기'(청록),
// 지금 시각은 달력 앱처럼 가로 빨간 선. 장소마다 번호 · 도착 시각 · 이름 · 사진 · 자녀 메모 (지난 장소는 사진 · 메모를 접는다)
import { Fragment, useEffect, useRef, useState } from "react";
import { CheckIcon, MapPinIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { isTourApiPhoto } from "@/shared/data/placeSchema";
import type { Course } from "@/shared/domain/types";
import type { NowPos, StopState } from "@/shared/engine/timeline";
import { hhmm } from "@/shared/lib/date";

const CARD_TONE: Record<StopState, string> = {
  done: "border-transparent bg-background-subtle text-foreground",
  now: "border-primary bg-accent text-accent-foreground shadow-sm",
  upcoming: "border-border bg-card text-card-foreground",
};

const LINE_ROW = "py-3";
const GAP_PX = 12; // 목록 사이 간격 (gap-3)

const DOT_TONE: Record<StopState, string> = {
  done: "bg-success text-success-foreground",
  now: "bg-course text-course-foreground",
  upcoming: "bg-course-soft text-course-soft-foreground",
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
  // 지금 장소의 머리줄(번호 · 시각 · 이름 · 지금 여기)이나 지금 선 + 다음 장소 머리줄이 아래 띠에 가려 있을 때만 올린다.
  // 맨 위(날짜 · 코스 이름)부터 보여도 되면 맨 위, 아니면 그것이 띠 위에 보이는 가장 앞 칸을 화면 맨 위에 맞춘다:
  // 지난 장소를 될 수 있는 대로 남기고, 위에서 잘린 카드 조각이 생기지 않게.
  // 열 때와 지금 장소가 바뀔 때만 (30초마다 다시 그려도 화면을 움직이지 않는다). 애니메이션 없이 한 번에
  const listRef = useRef<HTMLOListElement>(null);
  const focusKey = `${String(states.indexOf("now"))}:${nowLine?.kind ?? ""}:${nowLine && "index" in nowLine ? String(nowLine.index) : ""}`;
  useEffect(() => {
    const rows = [...(listRef.current?.children ?? [])];
    const focus = rows.find((r) => r.hasAttribute("data-focus"));
    if (!focus) return;
    const dockTop = document.querySelector("[data-senior-dock]")?.getBoundingClientRect().top;
    const room = (dockTop ?? window.innerHeight) - GAP_PX;
    // 장소 사이의 선이면 가는 곳(다음 장소)의 머리줄까지
    const head =
      focus.querySelector("[data-head]") ??
      focus.nextElementSibling?.querySelector("[data-head]") ??
      focus;
    const headBottom = head.getBoundingClientRect().bottom;
    if (focus.getBoundingClientRect().top >= 0 && headBottom <= room) return; // 이미 보인다
    if (headBottom + window.scrollY <= room) {
      window.scrollTo(0, 0);
      return;
    }
    const row =
      rows
        .slice(0, rows.indexOf(focus) + 1)
        .find((r) => headBottom - r.getBoundingClientRect().top + GAP_PX <= room) ?? focus;
    window.scrollBy(0, row.getBoundingClientRect().top - GAP_PX);
  }, [focusKey]);

  if (course.stops.length === 0) {
    return <p className="text-2xl font-bold">일정이 아직 없어요</p>;
  }
  const lineBetween = nowLine !== null && nowLine.kind !== "inside";
  return (
    <>
      {/* 누를 수 없는 목록이라 길게 눌러도 메뉴가 뜨지 않게 한다 */}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- 목록 점을 지운 ol 은 Safari VoiceOver 가 목록으로 읽지 않는다 */}
      <ol
        ref={listRef}
        role="list"
        className="flex flex-col gap-3 select-none"
        style={{ WebkitTouchCallout: "none" }}
        aria-label="오늘 일정"
      >
        {nowLine?.kind === "before" && nowLine.index === 0 && (
          <li className={LINE_ROW} data-focus>
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
                <li className={LINE_ROW} data-focus>
                  <NowLine label={nowLabel} moving />
                </li>
              )}
              <li
                className={cn(
                  "relative rounded-2xl border-2 px-4 pt-4 pb-5",
                  CARD_TONE[state],
                  // 지금 선 자리: 글자 아래 빈칸 (선 · 시각 표시가 글자를 가로지르지 않게)
                  lineHere && "pb-16",
                )}
                data-state={state}
                data-focus={state === "now" && !lineBetween ? true : undefined}
              >
                {lineHere && <NowLine label={nowLabel} inside />}
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full text-xl font-extrabold tabular-nums",
                      DOT_TONE[state],
                    )}
                    aria-hidden="true"
                  >
                    {state === "done" ? <CheckIcon className="size-6" /> : i + 1}
                  </span>
                  <span className="text-2xl font-bold tabular-nums">{hhmm(s.arriveMin)}</span>
                  <StateTag state={state} />
                </div>
                <p className="mt-3 text-3xl leading-snug font-extrabold tracking-tight" data-head>
                  {s.place.name}
                  {s.role === "lunch" && (
                    <span className="bg-highlight text-highlight-foreground ml-2 inline-block rounded-full px-3 align-middle text-xl leading-8 font-bold tracking-normal">
                      점심
                    </span>
                  )}
                </p>
                {/* 주소: 길게 눌러 복사해 내비게이션에 붙여 넣을 수 있게 이 줄만 고를 수 있다 (누르는 단추는 아니다) */}
                {state !== "done" && s.place.address.trim() && (
                  <p
                    className="mt-2 flex items-start gap-2 text-2xl leading-snug font-semibold select-text"
                    style={{ WebkitTouchCallout: "default" }}
                  >
                    <MapPinIcon className="text-course mt-1 size-6 shrink-0" />
                    <span>
                      <span className="sr-only">주소 </span>
                      {s.place.address}
                    </span>
                  </p>
                )}
                {state !== "done" && s.place.photoUrl && (
                  <StopPhoto url={s.place.photoUrl} name={s.place.name} />
                )}
                {/* 자녀 메모: 수첩에 적은 것처럼 모래빛 세로줄 */}
                {memo && state !== "done" && (
                  <p className="border-highlight mt-3 border-l-4 pl-3 text-2xl leading-relaxed">
                    {memo}
                  </p>
                )}
              </li>
            </Fragment>
          );
        })}
        {nowLine?.kind === "after" && (
          <li className={LINE_ROW} data-focus>
            <NowLine label={nowLabel} />
          </li>
        )}
      </ol>
      {course.spare && (
        <div className="border-input rounded-2xl border-2 border-dashed px-4 py-4 select-none">
          <p className="text-xl font-bold">시간 남으면 들를 곳</p>
          <p className="mt-1 text-3xl leading-snug font-extrabold tracking-tight">
            {course.spare.name}
          </p>
        </div>
      )}
    </>
  );
}

/** 장소 사진: 가 보기 전에 어떤 곳인지 알아보게 크게. 못 불러오면 통째로 숨긴다 */
function StopPhoto({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="relative mt-3 overflow-hidden rounded-xl">
      <img
        src={url}
        alt={`${name} 사진`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="bg-background-subtle aspect-video w-full object-cover"
        onError={() => {
          setFailed(true);
        }}
      />
      {isTourApiPhoto(url) && (
        <span className="bg-foreground/60 text-background absolute right-2 bottom-2 rounded-full px-2.5 py-0.5 text-sm font-medium">
          사진: 한국관광공사
        </span>
      )}
    </div>
  );
}

/** 오른쪽 위 상태 표시. 지금 장소는 청록 알약, 지난 장소는 초록 글자 */
function StateTag({ state }: { state: StopState }) {
  if (state === "now") {
    return (
      <span className="bg-primary text-primary-foreground ml-auto rounded-full px-4 text-xl leading-9 font-extrabold whitespace-nowrap">
        지금 여기
      </span>
    );
  }
  if (state === "done") {
    return <span className="text-success ml-auto text-2xl font-extrabold">완료</span>;
  }
  return null;
}

/** 지금 시각 가로 선 (누를 수 없음). inside 면 지금 장소 카드의 아래 빈칸(pb-16)에, 카드 안 여백 안쪽으로 그린다:
 *  시각 표시(위아래 1rem)가 글자에 닿지 않는 자리. 카드에 이미 '지금 여기'가 있어 '지금'은 화면 읽기 프로그램에만.
 *  시각 표시는 다음 카드에도 가려지지 않게 맨 위(z-20) */
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
      className={cn("pointer-events-none h-1", inside ? "absolute inset-x-4 bottom-7" : "relative")}
    >
      <span className="bg-now-line absolute inset-x-0 top-0 h-1 rounded-full" aria-hidden="true" />
      <span
        className={cn(
          "bg-now-line absolute -top-2 size-5 rounded-full ring-4",
          inside ? "ring-accent left-0" : "ring-background -left-1",
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          "bg-now-line text-now-line-foreground absolute -top-4 z-20 rounded-full px-3 text-xl leading-9 font-extrabold whitespace-nowrap tabular-nums shadow-sm",
          inside ? "right-0" : "right-3",
        )}
      >
        <span className={cn(inside && "sr-only")}>지금 </span>
        {label}
        {moving ? " · 이동 중" : ""}
      </span>
    </div>
  );
}
