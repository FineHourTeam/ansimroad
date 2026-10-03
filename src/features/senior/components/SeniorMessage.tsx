// 불러오는 중 · 링크 오류 · 만료 · 연결 오류: 큰 글자 한두 줄 (S4 글자 기준 N-03)
import type { ReactNode } from "react";
import { Seo } from "@/components/Seo";
import { LoadingIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

/** 어르신 화면 틀: 휴대폰 폭 그대로 가운데, 흰 배경 + 진한 글자 (본문 24px) */
export function SeniorFrame({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground mx-auto flex min-h-dvh w-full max-w-lg flex-col text-2xl leading-normal sm:border-x">
      {children}
    </div>
  );
}

/** 아래 고정 영역: 누를 버튼은 스크롤하지 않아도 늘 보이게 (동의 화면 · 본 화면) */
export function SeniorDock({ children }: { children: ReactNode }) {
  return (
    <div
      className="bg-background sticky bottom-0 z-20 flex flex-col gap-3 border-t px-4 pt-4 shadow-lg"
      // 아이폰 홈 막대 위로 띄운다 (viewport-fit=cover)
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {children}
    </div>
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
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <h1 className="text-3xl leading-snug font-extrabold text-balance">{title}</h1>
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
        className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10"
        role="status"
        aria-live="polite"
      >
        <LoadingIcon className="text-primary size-10 animate-spin" />
        <p className="text-3xl font-extrabold">불러오는 중이에요</p>
      </main>
    </SeniorFrame>
  );
}
