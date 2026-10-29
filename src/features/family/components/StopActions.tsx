// 자녀 현황 장소 카드에서 바로 고치기 (대표 요청 2026-10-29, 코스 수정 화면 대신):
// ⋮ 메뉴(다음에 경로 추가 · 메모 · 삭제하기) · 다음에 갈 곳 고르기 · 메모 칸 · 전화 · 다녀온 가족 별점 팝업.
// 바꾼 내용은 부모님 화면에도 바로 보인다.
import { useId, useMemo, useState } from "react";
import {
  AddIcon,
  ChevronRightIcon,
  DeleteIcon,
  EditIcon,
  MoreVerticalIcon,
  PhoneIcon,
  StarIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePlaceData } from "@/features/places";
import { MEMO_MAX, usePlaceReviews } from "@/features/trip";
import type { Course, Place } from "@/shared/domain/types";
import { isClosedOn } from "@/shared/engine/rules";
import { kmText, telHref } from "@/shared/lib/format";
import { distanceMeters } from "@/shared/lib/geo";

/** 카드 머리 오른쪽 아이콘 단추: 누르는 자리는 44px, 위아래 음수 여백으로 번호 · 시각 줄 높이는 그대로 */
const HEAD_ICON = "hover:text-primary -my-3 size-11 shrink-0 rounded-full";

export function CallButton({ name, phone }: { name: string; phone: string }) {
  return (
    <Button asChild variant="ghost" size="icon" className={HEAD_ICON}>
      <a href={telHref(phone)} aria-label={`${name} 전화 걸기 ${phone}`}>
        <PhoneIcon />
      </a>
    </Button>
  );
}

/** ⋮ 메뉴. 고를 수 없는 경우(10곳 · 마지막 한 곳)는 누른 뒤 토스트로 이유를 알린다 */
export function StopMenu({
  name,
  hasMemo,
  onAddNext,
  onMemo,
  onRemove,
}: {
  name: string;
  hasMemo: boolean;
  onAddNext: () => void;
  onMemo: () => void;
  onRemove: () => void;
}) {
  const item = "min-h-11 gap-2 px-2.5 text-base";
  return (
    // modal={false}: 메뉴에서 연 대화상자를 닫은 뒤 화면이 눌리지 않는 문제를 피한다
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={HEAD_ICON} aria-label={`${name} 더 보기`}>
          <MoreVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem className={item} onSelect={onAddNext}>
          <AddIcon />
          다음에 경로 추가
        </DropdownMenuItem>
        <DropdownMenuItem className={item} onSelect={onMemo}>
          <EditIcon />
          {hasMemo ? "메모 고치기" : "메모 쓰기"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className={item} onSelect={onRemove}>
          <DeleteIcon />
          삭제하기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" aria-label={`${String(rating)}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          size="sm"
          fill="currentColor"
          aria-hidden="true"
          className={n <= rating ? "text-highlight" : "text-border"}
        />
      ))}
    </span>
  );
}

/** 다녀온 가족 별점 (평균 · 몇 명). 누르면 후기 팝업. 후기가 없거나 못 불러오면 줄을 비운다 (덧붙임 정보) */
export function PlaceRating({ placeId, name }: { placeId: string; name: string }) {
  const q = usePlaceReviews(placeId);
  if (q.isPending) return <Skeleton className="h-5 w-40" />;
  if (q.isError || q.data.length === 0) return null;
  const n = q.data.length;
  const avg = (q.data.reduce((s, r) => s + r.rating, 0) / n).toFixed(1);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="-mx-2 -my-1 h-11 w-fit gap-1 px-2 text-sm font-bold tabular-nums"
          aria-label={`${name} 별점 ${avg}점, 다녀온 가족 ${String(n)}명 후기 보기`}
        >
          <StarIcon size="sm" fill="currentColor" className="text-highlight" />
          {avg}
          <span className="text-muted-foreground font-medium">· 다녀온 가족 {n}명</span>
          <ChevronRightIcon size="sm" className="text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-dvh flex-col">
        <DialogTitle>{name} 후기</DialogTitle>
        <DialogDescription>
          다녀온 가족 {n}명 · 평균 {avg}점
        </DialogDescription>
        <ul className="-mx-1 flex flex-col divide-y overflow-y-auto px-1">
          {q.data.map((r, i) => (
            <li key={`${r.at}-${String(i)}`} className="flex flex-col gap-1 py-3">
              <Stars rating={r.rating} />
              {r.text ? (
                <p className="text-base leading-relaxed">“{r.text}”</p>
              ) : (
                <p className="text-muted-foreground text-sm">별점만 남겼어요</p>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/** [다음에 경로 추가] → 이 장소에서 가까운 순으로. 여행 날 쉬는 곳은 고를 수 없다 (X4) */
export function AddPlaceDialog({
  course,
  after,
  date,
  onOpenChange,
  onPick,
}: {
  course: Course;
  /** 이 순번 장소 다음에 넣는다 (null 이면 닫힘) */
  after: number | null;
  date: string;
  onOpenChange: (open: boolean) => void;
  onPick: (place: Place) => void;
}) {
  const q = usePlaceData();
  const from = after === null ? undefined : course.stops[after]?.place;
  const list = useMemo(() => {
    const inCourse = new Set(course.stops.map((s) => s.place.id));
    return (q.data?.places ?? [])
      .filter((p) => !inCourse.has(p.id))
      .map((p) => ({
        place: p,
        m: from ? distanceMeters(from, p) : 0,
        closed: isClosedOn(p, date),
      }))
      .sort((a, b) => Number(a.closed) - Number(b.closed) || a.m - b.m);
  }, [q.data, course, from, date]);

  return (
    <Dialog open={after !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-dvh flex-col">
        <DialogTitle>{from ? `${from.name} 다음에 갈 곳` : "다음에 갈 곳"}</DialogTitle>
        <DialogDescription>
          가까운 곳부터 보여요. 고르면 바로 일정에 들어가고 부모님 화면에도 보여요.
        </DialogDescription>
        {q.isPending ? (
          <div className="flex flex-col gap-2" aria-label="장소 목록을 불러오는 중이에요">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : q.isError ? (
          <div role="alert" className="flex flex-col items-center gap-2 py-4 text-center">
            <p className="font-bold">장소 목록을 불러오지 못했어요</p>
            <Button variant="outline" size="xl" onClick={() => void q.refetch()}>
              다시 불러오기
            </Button>
          </div>
        ) : list.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center">더 넣을 수 있는 장소가 없어요</p>
        ) : (
          <ul aria-label="넣을 수 있는 장소" className="-mx-2 flex flex-col overflow-y-auto">
            {list.map(({ place, m, closed }) => (
              <li key={place.id}>
                <Button
                  variant="ghost"
                  className="h-auto min-h-14 w-full justify-start gap-3 px-2 py-2 text-left whitespace-normal"
                  disabled={closed}
                  aria-label={`${place.name} 넣기${closed ? " (그날 쉬어요)" : ""}`}
                  onClick={() => {
                    onPick(place);
                  }}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-base font-bold">{place.name}</span>
                    <span className="text-muted-foreground text-sm font-medium">
                      {place.type}
                      {from && ` · ${kmText(m)}`}
                      {closed && " · 그날 쉬어요"}
                    </span>
                  </span>
                  {!closed && <AddIcon className="text-primary" />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** 카드 안 메모 칸 (부모님 화면에도 보인다). 저장에 실패하면 칸을 그대로 둔다 */
export function MemoEditor({
  name,
  initial,
  onSave,
  onClose,
}: {
  name: string;
  initial: string;
  onSave: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const id = useId();
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <div className="bg-background-subtle flex flex-col gap-2 rounded-xl p-3">
      <Label htmlFor={id} className="flex-wrap text-sm font-bold">
        메모
        <span className="text-muted-foreground font-medium">(부모님 화면에도 보여요)</span>
      </Label>
      <Textarea
        id={id}
        rows={2}
        maxLength={MEMO_MAX}
        placeholder="예: 예약했어요, 입구에서 만나요"
        value={text}
        // 메뉴에서 '메모 쓰기'를 눌러 연 칸이라 바로 입력할 수 있게
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        aria-label={`${name} 메모`}
        className="text-base"
        onChange={(e) => {
          setText(e.target.value);
        }}
      />
      <div className="grid grid-cols-2 gap-1.5">
        <Button variant="outline" size="xl" disabled={busy} onClick={onClose}>
          취소
        </Button>
        <Button
          size="xl"
          disabled={busy}
          aria-busy={busy}
          onClick={() => {
            setBusy(true);
            onSave(text).then(onClose, () => {
              setBusy(false);
            });
          }}
        >
          저장
        </Button>
      </div>
    </div>
  );
}
