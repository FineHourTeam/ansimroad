// 확정 직후 자녀가 할 일: 부모님께 링크 보내기 (여행 전에만 크게). 보조 기능(코스 수정 · 링크 · 인쇄 · 이미지)은 한 줄 메뉴로.
// 여행을 마치면 맨 위에 리포트 링크가 뜬다.
import type { ReactNode } from "react";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { ChevronRightIcon, ImageIcon, MapPinIcon, PrintIcon, ShareIcon } from "@/components/icons";
import type { TripSnapshot } from "@/shared/domain/types";
import { absoluteUrl } from "../lib/links";
import { SeniorShareButtons } from "./SeniorShareButtons";
import { UrlPill } from "./SheetParts";

export function ReportCard({ reportToken }: { reportToken: string }) {
  return (
    <Link
      to={paths.report(reportToken)}
      className="bg-highlight text-highlight-foreground flex min-h-16 items-center gap-3 rounded-2xl px-4 py-4 shadow-sm"
    >
      <span className="bg-highlight-foreground/10 text-highlight-foreground grid size-11 shrink-0 place-items-center rounded-full">
        <ImageIcon />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <strong className="text-lg leading-snug">여행 리포트가 만들어졌어요</strong>
        <span className="text-sm font-semibold">가족 · 친구에게 공유해 보세요</span>
      </span>
      <ChevronRightIcon />
    </Link>
  );
}

/** 코스 보기·수정 · 링크 모아 보기 · 인쇄 · 이미지 — 아이콘 칸 한 줄 */
export function FamilyLinks({ token, printOn }: { token: string; printOn: boolean }) {
  const links: { to: string; label: string; icon: ReactNode }[] = [
    { to: paths.familyCourse(token), label: "코스 보기·수정", icon: <MapPinIcon /> },
    { to: paths.share(token), label: "링크 모아 보기", icon: <ShareIcon /> },
    ...(printOn ? [{ to: paths.print(token), label: "인쇄 · 이미지", icon: <PrintIcon /> }] : []),
  ];
  return (
    <nav
      aria-label="코스 바로가기"
      className="bg-card text-card-foreground grid auto-cols-fr grid-flow-col divide-x overflow-hidden rounded-2xl border shadow-sm"
    >
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="hover:bg-accent/60 focus-visible:ring-ring/50 flex min-h-20 flex-col items-center justify-center gap-1.5 px-1 py-3 text-center text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-inset"
        >
          <span className="bg-accent text-primary grid size-9 place-items-center rounded-full">
            {l.icon}
          </span>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function SendCard({ trip, seniorToken }: { trip: TripSnapshot; seniorToken: string }) {
  const url = absoluteUrl(paths.senior(seniorToken));
  return (
    <section
      aria-labelledby="family-send-title"
      className="bg-card text-card-foreground border-primary/40 flex flex-col gap-3 rounded-2xl border p-5 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <h2 id="family-send-title" className="text-lg font-bold tracking-tight">
          부모님께 링크를 보내 주세요
        </h2>
        <p className="text-muted-foreground">
          부모님은 이 링크 하나로 일정을 보고 사진만 찍으시면 돼요.
        </p>
      </div>
      <UrlPill url={url} />
      <SeniorShareButtons trip={trip} url={url} />
    </section>
  );
}
