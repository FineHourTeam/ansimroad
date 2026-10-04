// 인쇄용 화면 아래 고정 띠: 이미지로 공유하기 · 이미지로 저장하기 · 인쇄하기
// 이미지는 화면 밖 카드(ImageCard)를 누를 때 PNG 로 굽는다. 파일 공유가 안 되는 기기는 저장으로 대신하고 알려 준다.
import { useState, type RefObject } from "react";
import { toast } from "sonner";
import { DownloadIcon, LoadingIcon, PrintIcon, ShareIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { TripSnapshot } from "@/shared/domain/types";
import { StickyActionBar } from "@/shared/components/common";
import { koreanMonthDay } from "@/shared/lib/date";
import { canShareFile, imageFileName, renderCardPng, saveBlob } from "../lib/imageExport";

type Busy = "save" | "share" | null;

const isError = (e: unknown, name: string) => e instanceof DOMException && e.name === name;

export function PrintActions({
  trip,
  cardRef,
  printReady,
}: {
  trip: TripSnapshot;
  cardRef: RefObject<HTMLDivElement | null>;
  /** 후기를 다 불러온 뒤에 인쇄 (후기도 싣는다) */
  printReady: boolean;
}) {
  const [busy, setBusy] = useState<Busy>(null);
  const name = imageFileName(trip.input.date, trip.course.title);
  const head = `${koreanMonthDay(trip.input.date)} ${trip.course.title}`;

  const run = async (kind: "save" | "share") => {
    const node = cardRef.current;
    if (busy || !node) return;
    setBusy(kind);
    try {
      const blob = await renderCardPng(node);
      const file = new File([blob], name, { type: "image/png" });
      const saveInstead = () => {
        saveBlob(blob, name);
        toast("이 기기에서는 이미지 공유가 안 돼서 저장했어요. 사진첩에서 골라 보내 주세요");
      };
      if (kind === "save") {
        saveBlob(blob, name);
        toast.success("일정표 이미지를 저장했어요");
      } else if (!canShareFile(file)) {
        saveInstead();
      } else {
        const data = { files: [file], title: head, text: `${head} 일정표예요` };
        try {
          await navigator.share(data);
        } catch (e) {
          if (isError(e, "AbortError")) return;
          // 이미지를 굽는 사이 '누른 순간'이 지나 공유 창이 막힌 경우: 한 번 더 누르면 바로 열린다
          if (isError(e, "NotAllowedError")) {
            toast("이미지가 준비됐어요", {
              action: {
                label: "공유하기",
                onClick: () => void navigator.share(data).catch(saveInstead),
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
          {busy === "save" ? "만드는 중…" : "이미지로 저장하기"}
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
