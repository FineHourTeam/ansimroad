// 인쇄용 화면 아래 고정 띠: 이미지로 공유하기 · 이미지 저장 · 인쇄하기
// 이미지는 화면 밖 카드(ImageCard)를 누를 때 PNG 로 굽는다. 파일 공유가 안 되는 기기는 저장으로 대신하고 알려 준다.
// PC 는 공유 창에 카카오톡이 없어서(모담 2026-10-29) 공유 대신 [이미지 저장] · [글 복사] · [인쇄하기]. 보내는 방법은 저장 뒤 알림으로만 안내.
import { useState, type RefObject } from "react";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon, LoadingIcon, PrintIcon, ShareIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { TripSnapshot } from "@/shared/domain/types";
import { StickyActionBar } from "@/shared/components/common";
import { koreanMonthDay } from "@/shared/lib/date";
import { copyText, isMobileDevice } from "@/shared/lib/share";
import { canShareFile, imageFileName, renderCardPng, saveBlob } from "../lib/imageExport";
import { scheduleShareText } from "../lib/shareText";

type Busy = "save" | "share" | null;

const isError = (e: unknown, name: string) => e instanceof DOMException && e.name === name;

export function PrintActions({
  trip,
  seniorUrl,
  cardRef,
  printReady,
}: {
  trip: TripSnapshot;
  /** 공유 글 맨 끝의 '사진 남기기' 링크 (부모님용만) */
  seniorUrl: string | null;
  cardRef: RefObject<HTMLDivElement | null>;
  /** 후기를 다 불러온 뒤에 인쇄 (후기도 싣는다) */
  printReady: boolean;
}) {
  const [busy, setBusy] = useState<Busy>(null);
  const [mobile] = useState(isMobileDevice);
  const name = imageFileName(trip.input.date, trip.course.title);
  const head = `${koreanMonthDay(trip.input.date)} ${trip.course.title}`;
  const text = scheduleShareText(trip, seniorUrl);
  const copyAction = {
    label: "글 복사",
    onClick: () =>
      void copyText(text).then((ok) => {
        if (ok) toast.success("일정 글을 복사했어요");
        else toast.error("복사하지 못했어요. 다시 눌러 주세요");
      }),
  };
  // 그림과 글을 함께 보내도 받는 앱에 따라 글이 빠질 수 있다 (iOS 일부 앱은 글이 있으면 그림을 버린다는 보고도 있다).
  // 공유를 마치면 '글 복사' 단추를 띄워 빠졌을 때 붙여 넣게 한다
  const offerCopy = () => {
    toast("글이 빠졌다면 '글 복사'를 눌러 붙여 넣어 주세요", {
      duration: 10_000,
      action: copyAction,
    });
  };

  const run = async (kind: "save" | "share") => {
    const node = cardRef.current;
    if (busy || !node) return;
    setBusy(kind);
    try {
      const blob = await renderCardPng(node);
      const file = new File([blob], name, { type: "image/png" });
      // 공유가 안 되면 이미지는 저장하고, 일정 글은 '글 복사'로 따로 붙여 넣게 한다
      const saveInstead = () => {
        saveBlob(blob, name);
        toast("이 기기에서는 이미지 공유가 안 돼서 저장했어요. 사진첩에서 골라 보내 주세요", {
          duration: 10_000,
          action: copyAction,
        });
      };
      if (kind === "save") {
        saveBlob(blob, name);
        if (mobile) toast.success("일정표 이미지를 저장했어요");
        else
          toast.success("일정표 이미지를 저장했어요", {
            description:
              "PC 카카오톡 대화방에 이미지를 끌어다 놓고, 일정 글은 [글 복사]로 붙여 넣어 주세요",
            duration: 10_000,
            action: copyAction,
          });
      } else if (!canShareFile(file)) {
        saveInstead();
      } else {
        const data = { files: [file], title: head, text };
        try {
          await navigator.share(data);
          offerCopy();
        } catch (e) {
          if (isError(e, "AbortError")) return;
          // 이미지를 굽는 사이 '누른 순간'이 지나 공유 창이 막힌 경우: 한 번 더 누르면 바로 열린다
          if (isError(e, "NotAllowedError")) {
            toast("이미지가 준비됐어요", {
              action: {
                label: "공유하기",
                // 공유 창을 닫은 것(AbortError)은 실패가 아니다 — 저장 · '공유가 안 돼서' 안내를 띄우지 않는다
                onClick: () =>
                  void navigator.share(data).then(offerCopy, (err: unknown) => {
                    if (!isError(err, "AbortError")) saveInstead();
                  }),
              },
            });
          } else saveInstead();
        }
      }
    } catch {
      toast.error("이미지를 만들지 못했어요. 다시 눌러 주세요");
    } finally {
      setBusy(null);
    }
  };

  const spinner = <LoadingIcon className="animate-spin" />;
  if (!mobile)
    return (
      <StickyActionBar>
        <div className="grid w-full grid-cols-3 gap-2">
          <Button
            size="xl"
            className="px-2"
            disabled={busy !== null}
            aria-busy={busy === "save"}
            onClick={() => void run("save")}
          >
            {busy === "save" ? spinner : <DownloadIcon />}
            {busy === "save" ? "만드는 중…" : "이미지 저장"}
          </Button>
          <Button variant="outline" size="xl" className="px-2" onClick={copyAction.onClick}>
            <CopyIcon />글 복사
          </Button>
          <Button
            variant="outline"
            size="xl"
            className="px-2"
            disabled={!printReady}
            onClick={() => {
              window.print();
            }}
          >
            <PrintIcon />
            인쇄하기
          </Button>
        </div>
      </StickyActionBar>
    );
  return (
    <StickyActionBar>
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
        <Button
          size="xl"
          className="col-span-2 sm:order-last sm:col-span-1"
          disabled={busy !== null}
          aria-busy={busy === "share"}
          onClick={() => void run("share")}
        >
          {busy === "share" ? spinner : <ShareIcon />}
          {busy === "share" ? "이미지 만드는 중…" : "이미지로 공유하기"}
        </Button>
        <Button
          variant="outline"
          size="xl"
          className="px-2"
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
          className="px-2"
          disabled={!printReady}
          onClick={() => {
            window.print();
          }}
        >
          <PrintIcon />
          인쇄하기
        </Button>
      </div>
    </StickyActionBar>
  );
}
