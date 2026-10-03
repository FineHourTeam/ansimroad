// 여러 화면이 함께 쓰는 작은 컴포넌트 (상단 바 · 확인 배지 · 법적 고지 · 응급실 줄 · 로딩 · 안내)
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { paths } from "@/app/paths";
import { ArrowLeftIcon, HospitalIcon, InfoIcon, LoadingIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EmergencyInfo, VerifyStatus } from "@/shared/domain/types";
import { erDisplayName, telHref } from "@/shared/lib/format";
import { verifyBadgeText } from "@/shared/lib/placeFacts";

/** 상단 바. back 이 문자열이면 그 주소로, 함수면 실행. 없으면 뒤로 버튼을 그리지 않는다. */
export function TopBar({
  title,
  back,
  right,
}: {
  title: string;
  back?: string | (() => void);
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur print:hidden">
      <div className="mx-auto grid h-14 max-w-3xl grid-cols-[3rem_1fr_3rem] items-center px-2">
        {back ? (
          <Button
            variant="ghost"
            size="icon"
            // 손가락 탭 기준 44px (기본 icon 은 32px). 헤더 칸이 3rem 이라 그대로 들어간다
            className="size-11 [&_svg:not([class*='size-'])]:size-6"
            aria-label="뒤로"
            onClick={() => {
              if (typeof back === "string") void navigate(back);
              else back();
            }}
          >
            <ArrowLeftIcon />
          </Button>
        ) : (
          <span />
        )}
        <h1 className="truncate text-center text-lg font-bold">{title}</h1>
        <div className="flex justify-end">{right}</div>
      </div>
    </header>
  );
}

/** 화면 본문 틀: 가운데 정렬 + 좌우 여백 */
export function PageBody({
  children,
  className,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <main
      className={cn("mx-auto w-full px-4 pt-4 pb-16", wide ? "max-w-5xl" : "max-w-3xl", className)}
    >
      {children}
    </main>
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
const LEGAL_LINK = "inline-flex min-h-11 items-center underline underline-offset-4";

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
    <p className={cn("text-muted-foreground mt-8 text-center text-sm print:hidden", className)}>
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

/** 응급실 줄 (탭 시 전화) */
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
        "border-emergency/40 bg-emergency-soft text-emergency-soft-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold",
        className,
      )}
      href={telHref(er.phone)}
    >
      <HospitalIcon size="sm" className="text-emergency" />
      <span>
        {prefix} · {erDisplayName(er.name)}
        {er.driveMin !== null ? ` (차로 ${String(er.driveMin)}분)` : ""} · {er.phone}
      </span>
    </a>
  );
}

export function Loading({ text = "불러오는 중이에요" }: { text?: string }) {
  return (
    <div
      className="text-muted-foreground flex flex-col items-center gap-3 py-16"
      role="status"
      aria-live="polite"
    >
      <LoadingIcon className="text-primary animate-spin" size="lg" />
      <p>{text}</p>
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
      <span className="bg-background-subtle text-primary grid size-14 place-items-center rounded-full">
        {icon}
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </div>
  );
}
