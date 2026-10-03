// ④ 사진 카드 (작은 썸네일만 채워 보이고, 누르면 원본 비율 그대로 크게 연다)
import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Course, PhotoRecord } from "@/shared/domain/types";
import { isoToHhmm } from "@/shared/lib/date";
import { kmText, naverMapLink } from "@/shared/lib/format";
import { photoWhere } from "../lib/familyView";

const BY_LABEL = { family: "내가 올린 사진", senior: "부모님 사진" } as const;

function Where({
  course,
  photo,
  locationOn,
}: {
  course: Course;
  photo: PhotoRecord;
  locationOn: boolean;
}) {
  const w = photoWhere(course, photo, locationOn);
  if (w.kind === "picked") return <p className="text-sm">{w.name} 칸에 올린 사진</p>;
  if (w.kind === "scheduled") return <p className="text-sm">{w.name} 일정 중에 찍었어요</p>;
  if (w.kind === "none") return <p className="text-sm">위치 정보 없음</p>;
  if (w.kind === "outside") {
    return (
      <p className="text-sm">
        경로 밖 · 가장 가까운 곳 {w.name} · {kmText(w.meters)}
      </p>
    );
  }
  return (
    <>
      <p className="text-success flex items-center gap-1 text-sm font-bold">
        {w.name}
        <CheckIcon size="sm" label="도착 확인" />
      </p>
      <a
        className="text-primary inline-flex min-h-12 items-center text-sm font-bold underline underline-offset-4"
        href={naverMapLink(w.name, w.address)}
        target="_blank"
        rel="noopener noreferrer"
      >
        지도에서 보기
      </a>
    </>
  );
}

export function PhotoCard({
  photo,
  course,
  locationOn,
}: {
  photo: PhotoRecord;
  course: Course;
  locationOn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const time = isoToHhmm(photo.takenAt);
  return (
    <article className="border-success bg-card text-card-foreground flex flex-col gap-2 rounded-lg border-2 p-2">
      <button
        type="button"
        className="bg-background-subtle block aspect-4/3 w-full cursor-zoom-in overflow-hidden rounded-md"
        aria-label={`${time} 사진 크게 보기`}
        onClick={() => {
          setOpen(true);
        }}
      >
        <img
          src={photo.url}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      </button>
      <div className="flex flex-col gap-0.5 px-1">
        <p className="text-base font-bold tabular-nums">{time} 사진</p>
        <p className="text-muted-foreground text-sm">{BY_LABEL[photo.by]}</p>
        <Where course={course} photo={photo} locationOn={locationOn} />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          className="flex max-h-dvh flex-col sm:max-w-3xl"
        >
          <DialogTitle>{time} 사진</DialogTitle>
          <img
            src={photo.url}
            alt={`${time} 사진 원본`}
            className="min-h-0 w-full flex-1 rounded-md object-contain"
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="xl">
                닫기
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
