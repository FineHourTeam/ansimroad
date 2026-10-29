// 첫 화면 '최근 만든 여행' (모담 제안 2026-10-29): 이 휴대폰에서 확정한 여행의 자녀 화면을 다시 연다.
// 목록은 이 기기(localStorage)에만 있다. 없으면 아무것도 그리지 않는다.
import { useState } from "react";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { koreanMonthDay, WEEKDAYS, weekdayOf } from "@/shared/lib/date";
import { recentTrips } from "@/shared/lib/recentTrips";

export function RecentTrips({ today, className }: { today: string; className?: string }) {
  const [trips] = useState(() => recentTrips(today));
  if (trips.length === 0) return null;
  return (
    <section
      aria-labelledby="recent-trips-title"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-2 rounded-2xl border p-4 shadow-sm",
        className,
      )}
    >
      <h2 id="recent-trips-title" className="px-1 text-lg font-bold tracking-tight">
        최근 만든 여행
      </h2>
      <ul className="flex flex-col gap-1.5">
        {trips.map((t) => (
          <li key={t.token}>
            <Link
              to={paths.family(t.token)}
              className="bg-accent/60 hover:bg-accent focus-visible:ring-ring/50 flex min-h-14 items-center gap-2 rounded-xl px-4 py-2 outline-none focus-visible:ring-3"
            >
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                <strong className="text-base font-bold whitespace-nowrap">
                  {koreanMonthDay(t.date)}({WEEKDAYS[weekdayOf(t.date)]})
                </strong>
                <span className="text-muted-foreground font-semibold">{t.theme}</span>
              </span>
              <span className="text-primary inline-flex shrink-0 items-center gap-0.5 font-bold">
                열기
                <ChevronRightIcon size="sm" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground px-1 text-sm">
        이 휴대폰에서 확정한 여행만 보여요. 여행일 30일 뒤에는 목록에서 빠져요.
      </p>
    </section>
  );
}
