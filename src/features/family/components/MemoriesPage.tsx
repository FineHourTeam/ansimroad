// 여행 추억 페이지 (/f/{token}/memories, 모담 요청 2026-10-16): 올린 사진과 남긴 멘트로 만드는 인쇄 · 저장용 한 장.
// 여행을 마친 뒤 자녀 화면에서 연다. 저장: A4 인쇄 · PDF 저장(인쇄 창) · 이미지 저장 · 이미지 공유(카카오톡으로 가족에게).
// 사진은 여행일 + N일 뒤 지워지므로 그 전에 저장하라고 알린다.
import { useMemo, useRef, useState, type RefObject } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { Seo } from "@/components/Seo";
import { DownloadIcon, LoadingIcon, PrintIcon, ShareIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { usePhotos, useReviews } from "@/features/trip";
import { Loading, PageBody, StickyActionBar, TopBar } from "@/shared/components/common";
import type { TripSnapshot } from "@/shared/domain/types";
import { photosBySlot } from "@/shared/engine/timeline";
import { diffDays, koreanMonthDay } from "@/shared/lib/date";
import { useFamilyTrip } from "../hooks/useFamilyTrip";
import { useLightPrint } from "../hooks/useLightPrint";
import { canShareFile, imageFileName, renderCardPng, saveBlob } from "../lib/imageExport";
import { memoryEntries } from "../lib/memories";
import { FamilyStateView } from "./FamilyStateView";
import { MemoryBook } from "./MemoryBook";

type Busy = "save" | "share" | null;

/** 손글씨 글꼴을 받은 뒤에 이미지를 굽는다 (안 받은 채로 구우면 기본 글꼴로 찍힌다) */
async function fontsReady() {
  try {
    await document.fonts.load('24px "Nanum Pen Script"', "추억");
  } catch {
    // 글꼴을 못 받아도 이미지는 만든다 (기본 글꼴)
  }
}

function MemoryActions({
  trip,
  bookRef,
}: {
  trip: TripSnapshot;
  bookRef: RefObject<HTMLElement | null>;
}) {
  const [busy, setBusy] = useState<Busy>(null);
  const name = imageFileName(trip.input.date, `${trip.course.title}-추억`);
  const head = `${koreanMonthDay(trip.input.date)} 목포 여행 추억`;

  const run = async (kind: "save" | "share") => {
    const node = bookRef.current;
    if (busy || !node) return;
    setBusy(kind);
    try {
      await fontsReady();
      const blob = await renderCardPng(node);
      const file = new File([blob], name, { type: "image/png" });
      if (kind === "save" || !canShareFile(file)) {
        saveBlob(blob, name);
        toast.success(
          kind === "save"
            ? "추억 페이지 이미지를 저장했어요"
            : "이 기기에서는 이미지 공유가 안 돼서 저장했어요. 사진첩에서 골라 보내 주세요",
        );
        return;
      }
      try {
        await navigator.share({ files: [file], title: head });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        // 이미지를 굽는 사이 '누른 순간'이 지나 공유 창이 막힌 경우: 한 번 더 누르면 바로 열린다
        toast("이미지가 준비됐어요", {
          action: {
            label: "공유하기",
            onClick: () =>
              void navigator.share({ files: [file], title: head }).catch(() => {
                saveBlob(blob, name);
              }),
          },
        });
      }
    } catch {
      toast.error("이미지를 만들지 못했어요. 다시 눌러 주세요");
    } finally {
      setBusy(null);
    }
  };

  const spinner = <LoadingIcon className="animate-spin" />;
  return (
    <StickyActionBar>
      <div className="grid w-full grid-cols-3 gap-2">
        <Button
          size="xl"
          className="col-span-3"
          disabled={busy !== null}
          aria-busy={busy === "share"}
          onClick={() => void run("share")}
        >
          {busy === "share" ? spinner : <ShareIcon />}
          {busy === "share" ? "이미지 만드는 중…" : "이미지로 가족에게 보내기"}
        </Button>
        <Button
          variant="outline"
          size="xl"
          className="px-1 text-sm"
          disabled={busy !== null}
          aria-busy={busy === "save"}
          onClick={() => void run("save")}
        >
          {busy === "save" ? spinner : <DownloadIcon />}
          {busy === "save" ? "만드는 중…" : "이미지 저장"}
        </Button>
        <Button
          variant="outline"
          size="xl"
          className="px-1 text-sm"
          onClick={() => {
            window.print();
          }}
        >
          <PrintIcon />
          인쇄하기
        </Button>
        <Button
          variant="outline"
          size="xl"
          className="px-1 text-sm"
          onClick={() => {
            toast("인쇄 창의 대상(프린터)에서 'PDF로 저장'을 골라 주세요", { duration: 8000 });
            window.print();
          }}
        >
          <DownloadIcon />
          PDF 저장
        </Button>
      </div>
    </StickyActionBar>
  );
}

/** 사진 · 멘트를 장소별로 묶는다 (여행 문서가 준비된 뒤) */
function useMemoryEntries(trip: TripSnapshot | null, locationOn: boolean) {
  const photos = usePhotos(trip?.tripId ?? null);
  const reviews = useReviews(trip?.tripId ?? null, false);
  const entries = useMemo(
    () =>
      trip
        ? memoryEntries(
            trip.course,
            photosBySlot(trip.course, photos.data ?? [], locationOn),
            reviews.data ?? {},
          )
        : [],
    [trip, photos.data, reviews.data, locationOn],
  );
  return {
    entries,
    pending: photos.isPending || reviews.isPending,
    error: photos.isError || reviews.isError,
    retry: () => {
      void photos.refetch();
      void reviews.refetch();
    },
  };
}

export function MemoriesPage() {
  const { token = "" } = useParams();
  const state = useFamilyTrip(token);
  const trip = state.status === "ready" ? state.trip : null;
  const memories = useMemoryEntries(
    trip,
    state.status === "ready" && state.settings.locationCollectionEnabled,
  );
  const bookRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useLightPrint();
  // 앱 안에서 왔으면 온 곳으로, 링크로 바로 열었으면 자녀 현황으로
  const back = location.key === "default" ? paths.family(token) : () => void navigate(-1);
  const ready = trip && !memories.pending && !memories.error ? trip : null;
  const host = window.location.host;

  return (
    <>
      <Seo title="여행 추억 페이지" noindex />
      {/* A4 · 여백 12mm (이 화면에 있을 때만). 저장 직후 인쇄해도 알림(토스트)이 종이에 찍히지 않게 */}
      <style>
        {
          "@page { size: A4; margin: 12mm; } @media print { [data-sonner-toaster] { display: none !important; } }"
        }
      </style>
      <TopBar title="여행 추억 페이지" back={back} />
      <PageBody className="flex flex-col gap-4 print:max-w-none print:p-0">
        {state.status !== "ready" ? (
          <FamilyStateView state={state} />
        ) : memories.pending ? (
          <Loading text="사진과 멘트를 모으는 중이에요" />
        ) : memories.error ? (
          <div
            role="alert"
            className="bg-card flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 text-center"
          >
            <p className="font-bold">사진과 멘트를 불러오지 못했어요</p>
            <Button variant="outline" size="xl" onClick={memories.retry}>
              다시 불러오기
            </Button>
          </div>
        ) : (
          <>
            <p
              role="note"
              className="bg-highlight/25 text-highlight-foreground dark:bg-highlight/15 dark:text-highlight rounded-xl px-4 py-3 text-base font-semibold print:hidden"
            >
              사진은 여행 {diffDays(state.trip.expiresOn, state.trip.input.date)}일 뒤(
              {koreanMonthDay(state.trip.expiresOn)}) 자동 삭제되니 그 전에 저장하세요
            </p>
            <MemoryBook
              date={state.trip.input.date}
              course={state.trip.course}
              entries={memories.entries}
              host={host}
            />
          </>
        )}
      </PageBody>
      {ready && (
        <>
          <MemoryActions trip={ready} bookRef={bookRef} />
          {/* 이미지로 굽는 장: 폭 360px 로 화면 밖에 그려 둔다 (한 칸짜리 세로 이미지 — 카카오톡으로 보기 좋게) */}
          <div
            aria-hidden="true"
            inert
            className="pointer-events-none fixed top-0 left-full print:hidden"
          >
            <MemoryBook
              ref={bookRef}
              date={ready.input.date}
              course={ready.course}
              entries={memories.entries}
              host={host}
              className="w-90 rounded-none border-0 shadow-none"
            />
          </div>
        </>
      )}
    </>
  );
}
