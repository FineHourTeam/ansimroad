// 장소 한 곳 편집 (오른쪽 시트): 조사표 35칸 · 지도로 좌표 정하기 · 회색 점으로 다른 장소 열기 · 관광공사로 빈 칸 채우기 · 사진 · 저장 · 삭제
// 고친 칸이 남아 있으면 닫거나 다른 장소로 넘어가기 전에 묻는다. 저장하는 동안에는 닫히지 않는다.
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { DeletePlaceButton } from "./DeletePlaceButton";
import { PhotoField } from "./PhotoField";
import { PlaceField } from "./PlaceField";
import { draftProblem, fillBlanks, GROUPS, placePoints } from "./placeForm";
import { TourImport } from "./TourImport";
import { ChevronDownIcon, ErrorIcon, SearchIcon } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSavePlace } from "@/features/places";
import { MapView } from "@/shared/components/MapView";
import { COLUMNS, type Column } from "@/shared/data/placeSchema";
import type { PlaceRecord } from "@/shared/data/placeRecords";

export function PlaceEditor({
  initial,
  isNew: startsNew,
  records,
  onClose,
  onOpen,
}: {
  initial: PlaceRecord;
  isNew: boolean;
  records: PlaceRecord[];
  onClose: () => void;
  /** 지도의 회색 점을 눌러 다른 장소 열기 */
  onOpen: (r: PlaceRecord) => void;
}) {
  const idField = useId();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [isNew, setIsNew] = useState(startsNew);
  const [problem, setProblem] = useState<string | null>(null);
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const save = useSavePlace();
  const dirty = COLUMNS.some((c) => draft[c] !== saved[c]);

  // 닫기 · 다른 장소 열기: 저장 중이면 막고, 고친 칸이 있으면 먼저 묻는다
  const guard = (go: () => void) => {
    if (save.isPending) return;
    if (dirty) setLeave(() => go);
    else go();
  };

  const set = (col: Column, v: string) => {
    setDraft((d) => ({ ...d, [col]: v }));
  };
  // 입력할 때마다 지도를 다시 그리지 않게 좌표 · 이름 · 목록이 바뀔 때만
  const { ID, 장소명, 위도, 경도 } = draft;
  const points = useMemo(
    () => placePoints(records, { ID, 장소명, 위도, 경도 }),
    [records, ID, 장소명, 위도, 경도],
  );

  const submit = () => {
    const err = draftProblem(draft, records, isNew);
    setProblem(err);
    if (err) return;
    const sent = draft;
    save.mutate(sent, {
      onSuccess: () => {
        setIsNew(false);
        setSaved(sent);
        toast.success(`'${sent.장소명}' 저장했어요 · 코스 생성에 바로 반영돼요`);
      },
      onError: () => {
        setProblem("인터넷 연결이나 운영진 권한을 확인하고 다시 눌러 주세요");
      },
    });
  };

  const sectionId = (i: number) => `${idField}-g${String(i)}`;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) guard(onClose);
      }}
    >
      <SheetContent
        side="right"
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader className="gap-1 px-6 pt-5 pr-14 pb-3">
          <SheetTitle className="text-xl font-extrabold tracking-tight">
            {isNew ? "새 장소" : draft.장소명 || "(이름 없음)"}
          </SheetTitle>
          <SheetDescription>
            {isNew ? "조사표 35칸을 모두 여기서 고칠 수 있어요" : `ID ${draft.ID}`}
          </SheetDescription>
        </SheetHeader>
        {/* 35칸이 길어 묶음으로 바로 간다 */}
        <nav aria-label="칸 묶음" className="flex flex-wrap gap-1 border-b px-5 pb-3">
          {GROUPS.map((g, i) => (
            <Button
              key={g.title}
              variant="ghost"
              size="sm"
              className="rounded-full px-3"
              onClick={() => {
                document
                  .getElementById(sectionId(i))
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {g.title}
            </Button>
          ))}
        </nav>

        <div className="bg-background-subtle flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
          <details className="group bg-card text-card-foreground border-border/80 rounded-2xl border shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
              <SearchIcon size="sm" className="text-primary" />
              관광공사 정보로 빈 칸 채우기
              <ChevronDownIcon
                size="sm"
                className="text-muted-foreground ml-auto transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="px-5 pb-5">
              <TourImport
                records={records}
                mode="fill"
                onPick={(fields) => {
                  setDraft((d) => fillBlanks(d, fields));
                  toast.info("빈 칸을 관광공사 정보로 채웠어요. 확인 후 저장해 주세요");
                }}
              />
            </div>
          </details>

          {GROUPS.map((g, i) => (
            <div
              key={g.title}
              id={sectionId(i)}
              role="group"
              aria-labelledby={`${sectionId(i)}-h`}
              className="bg-card text-card-foreground border-border/80 flex scroll-mt-5 flex-col gap-4 rounded-2xl border p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3
                  id={`${sectionId(i)}-h`}
                  className="text-primary text-lg font-bold tracking-tight"
                >
                  {g.title}
                </h3>
                <p className="text-muted-foreground text-sm">{g.desc}</p>
              </div>
              {i === 0 && isNew && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor={idField}>
                    ID
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                    <span className="sr-only">(필수)</span>
                  </Label>
                  <Input
                    id={idField}
                    className="h-10 text-base md:text-base"
                    value={draft.ID}
                    onChange={(e) => {
                      set("ID", e.target.value.trim());
                    }}
                  />
                  <p className="text-muted-foreground text-xs">
                    저장한 뒤에는 바꿀 수 없어요. &apos;/&apos;와 공백은 쓸 수 없어요
                  </p>
                </div>
              )}
              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                {g.fields.map((f) => (
                  <PlaceField key={f.col} field={f} value={draft[f.col]} onChange={set} />
                ))}
              </div>
              {i === 0 && points.length > 0 && (
                <section className="flex flex-col gap-2" aria-label="위치 정하기">
                  <p className="text-muted-foreground text-sm">
                    지도 빈 곳을 누르면 이 장소의 위치가 그곳으로 바뀌어요 · 회색 점을 누르면 그
                    장소를 열어요
                  </p>
                  <MapView
                    className="isolate rounded-xl"
                    points={points}
                    selectedId={draft.ID}
                    onSelect={(p) => {
                      const r = p.id === draft.ID ? undefined : records.find((x) => x.ID === p.id);
                      if (r) {
                        guard(() => {
                          onOpen(r);
                        });
                      }
                    }}
                    onMapClick={(lat, lng) => {
                      setDraft((d) => ({ ...d, 위도: lat.toFixed(6), 경도: lng.toFixed(6) }));
                    }}
                  />
                </section>
              )}
              {g.fields.some((f) => f.col === "사진URL") && (
                <PhotoField
                  placeId={draft.ID}
                  value={draft.사진URL}
                  onChange={(update) => {
                    setDraft((d) => ({ ...d, 사진URL: update(d.사진URL) }));
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <SheetFooter className="gap-3 border-t px-6 py-4">
          {problem && (
            <p
              role="alert"
              className="bg-destructive/10 border-destructive/30 text-foreground flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold"
            >
              <ErrorIcon size="sm" className="text-destructive mt-0.5 shrink-0" />
              저장하지 못했어요: {problem}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-muted-foreground flex items-center gap-2 text-sm sm:mr-auto">
              {dirty && <span aria-hidden="true" className="bg-highlight size-2 rounded-full" />}
              {dirty ? "저장하지 않은 칸이 있어요" : "저장하면 시트와 같은 규칙으로 검사해요"}
            </span>
            <div className="flex justify-end gap-2">
              {!isNew && <DeletePlaceButton record={draft} onDeleted={onClose} />}
              <Button size="lg" className="px-5" disabled={save.isPending} onClick={submit}>
                {save.isPending ? "저장하는 중…" : "저장하기"}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>

      <AlertDialog
        open={leave !== null}
        onOpenChange={(open) => {
          if (!open) setLeave(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>고친 내용을 저장하지 않고 닫을까요?</AlertDialogTitle>
            <AlertDialogDescription>
              닫으면 고친 칸이 사라져요. 남기려면 [닫기]를 누르고 저장해 주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                leave?.();
              }}
            >
              저장하지 않고 닫기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
