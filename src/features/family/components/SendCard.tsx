// 링크 카드(부모님 링크 · 자녀 링크, 여행 전후 늘): 주소 칸 오른쪽에 [복사] [공유]. PC 처럼 공유 창이 안 되는 곳은
// [공유] 대신 부모님 쪽은 [글 복사](일정 글), 자녀 쪽은 [복사]만. 그 아래 '여행 일정 한눈에 보기' · 추억 페이지 예시.
// 여행을 마치면 맨 위에 리포트 · 추억 페이지 링크가 뜬다.
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { ChevronRightIcon, CopyIcon, ImageIcon, PrintIcon, ShareIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TripSnapshot } from "@/shared/domain/types";
import { canWebShare } from "@/shared/lib/share";
import {
  absoluteUrl,
  copyLink,
  displayUrl,
  SELF_LINK_HINT,
  sendFamilyLinkToSelf,
  sendSeniorLink,
} from "../lib/links";

/** 여행을 마친 뒤: 올린 사진과 남긴 멘트로 만든 추억 페이지 (인쇄 · PDF · 이미지) */
export function MemoriesCard({ token }: { token: string }) {
  return (
    <Link
      to={paths.memories(token)}
      className="bg-card text-card-foreground flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-4 shadow-sm"
    >
      <span className="bg-accent text-primary grid size-11 shrink-0 place-items-center rounded-full">
        <PrintIcon />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <strong className="text-lg leading-snug">추억 페이지 보기·인쇄</strong>
        <span className="text-muted-foreground text-sm font-semibold">
          사진과 멘트를 모아 인쇄하거나 이미지로 저장해요
        </span>
      </span>
      <ChevronRightIcon />
    </Link>
  );
}

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

/** 모래빛 주소 칸 한 줄: 왼쪽 주소(길면 말줄임) · 오른쪽 [복사] [공유] (공유 창이 안 되면 [공유] 대신 fallback, 없으면 복사 하나만) */
function LinkRow({
  who,
  url,
  onShare,
  fallback,
}: {
  who: "부모님" | "자녀";
  url: string;
  onShare: () => Promise<void>;
  fallback?: string;
}) {
  const shareable = canWebShare();
  const second = shareable ? "공유" : fallback;
  return (
    <div className="bg-background-subtle flex items-center gap-1.5 rounded-xl py-1.5 pr-1.5 pl-3.5">
      <p className="min-w-0 flex-1 truncate text-base font-semibold">
        <span className="sr-only">{who} 링크 </span>
        {displayUrl(url)}
      </p>
      <Button
        variant="outline"
        size="xl"
        className="bg-card shrink-0 px-3"
        aria-label={`${who} 링크 복사`}
        onClick={() => void copyLink(url, `${who} 링크를 복사했어요`)}
      >
        <CopyIcon />
        복사
      </Button>
      {second && (
        <Button
          variant="outline"
          size="xl"
          className="bg-card shrink-0 px-3"
          aria-label={shareable ? `${who} 링크 공유` : `${who} 일정 글 복사`}
          onClick={() => void onShare()}
        >
          {shareable ? <ShareIcon /> : <CopyIcon />}
          {second}
        </Button>
      )}
    </div>
  );
}

export function LinksCard({
  trip,
  seniorToken,
  familyToken,
}: {
  trip: TripSnapshot;
  seniorToken: string | null;
  familyToken: string;
}) {
  const seniorUrl = seniorToken ? absoluteUrl(paths.senior(seniorToken)) : null;
  const familyUrl = absoluteUrl(paths.family(familyToken));
  return (
    <div className="bg-card text-card-foreground border-primary/40 flex flex-col gap-4 rounded-2xl border p-5 shadow-sm">
      {seniorUrl && (
        <section aria-labelledby="links-senior" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="links-senior" className="text-lg font-bold tracking-tight">
              부모님 링크
            </h2>
            <p className="text-muted-foreground">
              부모님은 이 링크로 일정을 보고 사진만 찍으시면 돼요.
            </p>
          </div>
          <LinkRow
            who="부모님"
            url={seniorUrl}
            onShare={() => sendSeniorLink(trip, seniorUrl)}
            fallback="글 복사"
          />
        </section>
      )}
      {/* 자녀용 링크는 부모님께 보내지 않고 나에게 보관해 둔다 (모담 제안 2026-10-29) */}
      <section
        aria-labelledby="links-family"
        className="border-border/70 flex flex-col gap-3 not-first:border-t not-first:pt-4"
      >
        <h2 id="links-family" className="text-lg font-bold tracking-tight">
          자녀 링크 (이 화면)
        </h2>
        <LinkRow who="자녀" url={familyUrl} onShare={() => sendFamilyLinkToSelf(trip, familyUrl)} />
        <p className="text-muted-foreground text-sm">{SELF_LINK_HINT}</p>
      </section>
    </div>
  );
}

/** 추억 페이지 예시 그림 (e2e/capture/feedback.capture.ts 의 '이미지 저장' 결과를 줄인 것) */
const MEMORIES_EXAMPLE = "/content/memories-example.webp";

/** [예시]: 추억 페이지 예시 그림 대화상자 (여행을 마치기 전 '추억 페이지' 칸에서) */
export function MemoriesExampleButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="xl" className="px-4">
          예시
        </Button>
      </DialogTrigger>
      {/* PC 에선 예시 그림을 원래 폭(720px)에 가깝게 (모담 대표 요청 2026-10-29) */}
      <DialogContent aria-describedby={undefined} className="flex max-h-dvh flex-col sm:max-w-3xl">
        <DialogTitle>추억 페이지 예시</DialogTitle>
        <div className="min-h-0 overflow-y-auto rounded-lg border">
          <img
            src={MEMORIES_EXAMPLE}
            alt="추억 페이지 예시: 장소마다 사진과 남긴 멘트"
            className="w-full"
          />
        </div>
        <p className="text-muted-foreground">
          예시 화면이에요. 여행 날 올린 사진과 멘트로 만들어져요
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="xl">
              닫기
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** '여행 일정 한눈에 보기 ›' 한 줄 (따로 한 칸, 대표 요청 2026-10-29) */
export function FamilyLinks({ token, printOn }: { token: string; printOn: boolean }) {
  if (!printOn) return null;
  return (
    <Link
      to={paths.print(token)}
      className="bg-card text-primary hover:bg-accent/60 focus-visible:ring-ring/50 flex min-h-14 items-center gap-1 rounded-2xl border px-4 font-bold shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-inset"
    >
      여행 일정 한눈에 보기
      <ChevronRightIcon size="sm" />
    </Link>
  );
}
