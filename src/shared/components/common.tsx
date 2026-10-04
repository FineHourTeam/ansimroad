// 여러 화면이 함께 쓰는 작은 컴포넌트 (상단 바 · 본문 틀 · 아래 고정 띠 · 확인 배지 · 법적 고지 · 응급실 줄 · 로딩 · 안내)
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { paths } from "@/app/paths";
import { BrandMark } from "@/components/brand/BrandMark";
import { ArrowLeftIcon, HospitalIcon, InfoIcon, LoadingIcon, PhoneIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EmergencyInfo, VerifyStatus } from "@/shared/domain/types";
import { erDisplayName, telHref } from "@/shared/lib/format";
import { verifyBadgeText } from "@/shared/lib/placeFacts";

/**
 * 상단 바 (56px). back 이 문자열이면 그 주소로, 함수면 실행. 없으면 뒤로 버튼을 그리지 않는다.
 * brand: 뒤로 버튼이 없는 첫 화면급 화면(자녀 현황 · 리포트 등)에서 왼쪽에 안심로드 심볼을 둔다.
 */
export function TopBar({
  title,
  back,
  right,
  brand = false,
}: {
  title: string;
  back?: string | (() => void);
  right?: ReactNode;
  brand?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <header className="bg-background/90 border-border/70 sticky top-0 z-30 border-b backdrop-blur-md print:hidden">
      <div className="mx-auto grid h-14 max-w-3xl grid-cols-[3rem_1fr_3rem] items-center px-2">
        {back ? (
          <Button
            variant="ghost"
            size="icon"
            // 손가락 탭 기준 44px (기본 icon 은 32px). 헤더 칸이 3rem 이라 그대로 들어간다
            className="size-11 rounded-full [&_svg:not([class*='size-'])]:size-6"
            aria-label="뒤로"
            onClick={() => {
              if (typeof back === "string") void navigate(back);
              else back();
            }}
          >
            <ArrowLeftIcon />
          </Button>
        ) : brand ? (
          <span className="grid place-items-center">
            <BrandMark size={28} />
          </span>
        ) : (
          <span />
        )}
        <h1 className="truncate text-center text-lg font-bold tracking-tight">{title}</h1>
        <div className="flex justify-end">{right}</div>
      </div>
    </header>
  );
}

/**
 * 화면 본문 틀: 가운데 정렬 + 좌우 여백.
 * surface="subtle"(기본)이면 화면 바탕 전체가 모래빛이 되고 그 위에 흰 카드(Card)를 띄운다 (tokens.css body:has).
 * 흰 바탕이 필요한 화면(첫 화면 히어로 · 어르신 화면)은 surface="plain".
 */
export function PageBody({
  children,
  className,
  wide = false,
  surface = "subtle",
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
  surface?: "subtle" | "plain";
}) {
  return (
    <main
      data-surface={surface}
      className={cn("mx-auto w-full px-4 pt-5 pb-16", wide ? "max-w-5xl" : "max-w-3xl", className)}
    >
      {children}
    </main>
  );
}

/**
 * 화면 아래 고정 띠 — 주 행동 버튼(코스 만들기 · 이 코스로 확정하기)을 둔다. 위쪽 옅은 그림자 + 안전 영역 여백.
 * PageBody 바로 다음(화면의 마지막 요소)에 둔다. 버튼 하나면 className="w-full", 여럿이면 각 버튼에 "flex-1".
 */
export function StickyActionBar({
  children,
  className,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-background/95 border-border/70 shadow-bar sticky bottom-0 z-20 border-t backdrop-blur-md print:hidden",
        className,
      )}
      // 아이폰 홈 막대에 버튼이 가리지 않게 (env 는 Tailwind 스케일로 못 쓴다)
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        className={cn(
          "mx-auto flex w-full items-center gap-2 px-4 pt-3",
          wide ? "max-w-5xl" : "max-w-3xl",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function VerifyBadge({ status }: { status: VerifyStatus }) {
  const text = verifyBadgeText(status);
  if (!text) return null;
  return (
    <Badge
      variant="outline"
      className={status === "현장" ? "border-success text-success" : "border-primary text-primary"}
    >
      {text}
    </Badge>
  );
}

// 글자는 작아도 누르는 높이는 44px
const LEGAL_LINK =
  "hover:text-foreground inline-flex min-h-11 items-center underline decoration-border underline-offset-4";

/** 법적 고지 링크 (F-27). 위치정보 이용약관은 위치 수집 설정 ON 일 때만. */
export function LegalLinks({
  locationOn,
  prefix,
  className,
}: {
  locationOn: boolean;
  prefix?: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-muted-foreground mt-10 text-center text-sm print:hidden", className)}>
      {prefix}
      {prefix ? " · " : null}
      <Link className={LEGAL_LINK} to={paths.privacy}>
        개인정보 처리방침
      </Link>
      {locationOn && (
        <>
          {" · "}
          <Link className={LEGAL_LINK} to={paths.locationTerms}>
            위치정보 이용약관
          </Link>
        </>
      )}
    </p>
  );
}

/** 응급실 줄 (탭 시 전화). 경보처럼 보이지 않게 흰 줄 + 벽돌색 아이콘 하나만 (docs/DESIGN.md § 화면별 원칙) */
export function EmergencyLine({
  er,
  prefix = "응급실",
  className,
}: {
  er: EmergencyInfo | null;
  prefix?: string;
  className?: string;
}) {
  if (!er) return null;
  return (
    <a
      className={cn(
        "bg-card border-border/80 hover:bg-accent/60 flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
        className,
      )}
      href={telHref(er.phone)}
    >
      <span className="bg-emergency-soft text-emergency grid size-9 shrink-0 place-items-center rounded-full">
        <HospitalIcon size="sm" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">
          {prefix} · {erDisplayName(er.name)}
        </span>
        <span className="text-muted-foreground block tabular-nums">
          {er.driveMin !== null ? `차로 ${String(er.driveMin)}분 · ` : ""}
          {er.phone}
        </span>
      </span>
      <PhoneIcon size="sm" className="text-emergency shrink-0" />
    </a>
  );
}

export function Loading({ text = "불러오는 중이에요" }: { text?: string }) {
  return (
    <div
      className="text-muted-foreground flex flex-col items-center gap-4 py-20"
      role="status"
      aria-live="polite"
    >
      <span className="bg-accent text-primary grid size-14 place-items-center rounded-full">
        <LoadingIcon className="animate-spin" size="lg" />
      </span>
      <p className="font-medium">{text}</p>
    </div>
  );
}

/** 빈 화면 대신 보여 주는 안내 (N-06). icon 을 안 주면 안내 아이콘 */
export function StateMessage({
  title,
  icon = <InfoIcon size="lg" />,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <span className="bg-accent text-primary ring-accent/40 mb-2 grid size-16 place-items-center rounded-full ring-8">
        {icon}
      </span>
      <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}
