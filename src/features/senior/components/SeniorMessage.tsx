// 어르신 화면 틀 · 머리 · 아래 고정 띠, 그리고 불러오는 중 · 링크 오류 · 만료 · 연결 오류 안내 (S4 글자 기준 N-03)
import type { ReactNode } from "react";
import { tripDayLabel } from "../seniorView";
import { BrandMark } from "@/components/brand/BrandMark";
import { Seo } from "@/components/Seo";
import { LoadingIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { TripSnapshot } from "@/shared/domain/types";

/** 어르신 화면 틀: 휴대폰 폭 그대로 가운데, 흰 배경 + 진한 글자 (본문 24px) */
export function SeniorFrame({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground mx-auto flex min-h-dvh w-full max-w-lg flex-col text-2xl leading-normal sm:border-x">
      {children}
    </div>
  );
}

/** 화면 머리: 여행 날짜(청록 한 줄) + 코스 이름(큰 제목). 둘 다 h1 에 담는다. children 은 제목 아래 안내 */
export function SeniorHeader({
  trip,
  top,
  children,
}: {
  trip: Pick<TripSnapshot, "input" | "course">;
  /** 제목 위 (동의 화면의 로고) */
  top?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 px-5 pt-6 pb-1">
      {top}
      <h1 className="flex flex-col gap-1">
        <span className="text-primary text-xl font-bold tabular-nums">
          {tripDayLabel(trip.input.date)}
        </span>{" "}
        <span className="text-3xl leading-tight font-extrabold tracking-tight text-balance">
          {trip.course.title}
        </span>
      </h1>
      {children}
    </header>
  );
}

/** 아래 고정 영역: 누를 버튼은 스크롤하지 않아도 늘 보이게 (동의 화면 · 본 화면). 위쪽 옅은 그림자,
 *  뒤 글자가 비치지 않게 불투명 바탕 */
export function SeniorDock({ children }: { children: ReactNode }) {
  return (
    <div
      data-senior-dock
      className="bg-background border-border/70 shadow-bar sticky bottom-0 z-20 flex flex-col gap-2 border-t px-4 pt-2"
      // 아이폰 홈 막대 위로 띄운다 (viewport-fit=cover)
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {children}
    </div>
  );
}

/** 안내 화면 가운데 동그라미 (로고 · 불러오는 중) */
function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="bg-accent text-primary ring-accent/40 grid size-24 place-items-center rounded-full ring-8">
      {children}
    </span>
  );
}

export function SeniorMessage({
  title,
  sub,
  onRetry,
}: {
  title: string;
  sub?: string;
  /** 연결 오류일 때만: 다시 불러오기 */
  onRetry?: () => void;
}) {
  return (
    <SeniorFrame>
      <Seo title={title} noindex />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-10 text-center">
        <Badge>
          <BrandMark size={56} />
        </Badge>
        <h1 className="mt-4 text-3xl leading-snug font-extrabold tracking-tight text-balance">
          {title}
        </h1>
        {sub && <p className="text-2xl font-medium text-pretty">{sub}</p>}
        {onRetry && (
          <Button size="senior" className="mt-4 w-full" onClick={onRetry}>
            다시 불러오기
          </Button>
        )}
      </main>
    </SeniorFrame>
  );
}

export function SeniorLoading() {
  return (
    <SeniorFrame>
      <Seo title="불러오는 중이에요" noindex />
      <main
        className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-10"
        role="status"
        aria-live="polite"
      >
        <Badge>
          <LoadingIcon className="size-12 animate-spin" />
        </Badge>
        <p className="mt-4 text-3xl font-extrabold">불러오는 중이에요</p>
      </main>
    </SeniorFrame>
  );
}
