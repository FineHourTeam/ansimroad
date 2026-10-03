// ② 현황 배너 (F-22): 지금 어디쯤인지 3초 안에. 불안을 주지 않도록 경고 색은 쓰지 않는다.
import { cn } from "@/lib/utils";
import type { BannerText } from "../lib/familyView";

export function StatusBanner({ banner }: { banner: BannerText }) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border-2 px-4 py-3 text-center",
        banner.tone === "ok"
          ? "border-success/40 bg-success/5 text-success"
          : "border-primary/30 bg-primary/5 text-primary",
      )}
    >
      <p className="text-lg leading-snug font-bold text-balance">{banner.main}</p>
      <p className="mt-0.5 text-base font-semibold">{banner.sub}</p>
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
