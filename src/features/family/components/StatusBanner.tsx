// ② 현황 카드 (F-22): 지금 어디쯤인지 3초 안에 — 자녀 화면의 주인공. 불안을 주지 않도록 경고 색은 쓰지 않는다.
import { CameraIcon, CheckIcon, ClockIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { BannerText } from "../lib/familyView";

export type TripPhase = "before" | "today" | "done";
const PHASE_LABEL: Record<TripPhase, string> = {
  before: "여행 전",
  today: "오늘 여행 중",
  done: "여행 끝",
};

export function StatusBanner({ banner, phase }: { banner: BannerText; phase: TripPhase }) {
  return (
    <div
      role="status"
      className="bg-primary text-primary-foreground dark:bg-accent dark:text-accent-foreground relative rounded-2xl px-5 pt-4 pb-5 shadow-sm"
    >
      {/* 끝났으면 체크, 사진이 왔으면 카메라, 아직이면 시계 */}
      <span className="bg-primary-foreground/15 absolute top-4 right-4 grid size-12 place-items-center rounded-full">
        {phase === "done" ? (
          <CheckIcon size="lg" />
        ) : banner.tone === "ok" ? (
          <CameraIcon size="lg" />
        ) : (
          <ClockIcon size="lg" />
        )}
      </span>
      <span className="bg-primary-foreground/15 inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-sm font-semibold">
        <span
          aria-hidden="true"
          className={cn(
            "size-2 rounded-full",
            phase === "today" ? "bg-highlight animate-pulse" : "bg-primary-foreground/70",
          )}
        />
        {PHASE_LABEL[phase]}
      </span>
      <p className="mt-3 pr-14 text-2xl leading-tight font-extrabold tracking-tight text-balance">
        {banner.main}
      </p>
      <p className="mt-1.5 text-base font-semibold">{banner.sub}</p>
    </div>
  );
}

/** 달력 앱처럼 지금 시각을 가로 빨간 선으로 (누를 수 없음) */
export function NowLine({ label, moving = false }: { label: string; moving?: boolean }) {
  const text = `지금 ${label}${moving ? " · 이동 중" : ""}`;
  return (
    <div
      role="img"
      aria-label={text}
      className="border-now-line pointer-events-none relative h-0 border-t-2"
    >
      <span className="bg-now-line text-now-line-foreground absolute -top-1.5 -left-1 size-3 rounded-full" />
      <span className="bg-now-line text-now-line-foreground absolute -top-3.5 right-2 rounded-full px-2 text-sm leading-6 font-bold whitespace-nowrap">
        {text}
      </span>
    </div>
  );
}
