// 장소 메모: 입력하면 바로 이 기기에 저장. '나만 보기'(기본 켜짐)를 끄면 확정할 때 어르신·가족 화면에도 나간다.
import { useId, useState } from "react";
import { AddIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMemo, setMemo, type Memo } from "@/shared/lib/memo";

export function MemoBox({ placeId, readOnly }: { placeId: string; readOnly: boolean }) {
  const [memo, setLocal] = useState<Memo>(() => getMemo(placeId));
  const [open, setOpen] = useState(false);
  const id = useId();
  const update = (m: Memo) => {
    setLocal(m);
    setMemo(placeId, m);
  };

  if (readOnly) {
    return memo.text ? (
      <p className="bg-background-subtle rounded-md px-3 py-2 text-base">
        메모{memo.priv ? " (나만 보기)" : ""}: {memo.text}
      </p>
    ) : null;
  }
  if (!open && !memo.text) {
    return (
      <Button
        variant="link"
        size="xl"
        className="self-start px-0 font-bold"
        onClick={() => {
          setOpen(true);
        }}
      >
        <AddIcon size="sm" />
        메모 남기기
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${id}-memo`} className="text-base">
        메모
      </Label>
      <Textarea
        id={`${id}-memo`}
        rows={2}
        maxLength={200}
        placeholder="예: 예약 필요, 아버지 입맛에 맞는 메뉴"
        value={memo.text}
        // 방금 '메모 남기기'를 눌러 연 칸에만 바로 입력할 수 있게
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={open && !memo.text}
        className="text-base"
        onChange={(e) => {
          update({ ...memo, text: e.target.value });
        }}
      />
      <div className="flex min-h-12 flex-wrap items-center gap-x-2 gap-y-1">
        <Checkbox
          id={`${id}-priv`}
          checked={memo.priv}
          onCheckedChange={(v) => {
            update({ ...memo, priv: v === true });
          }}
        />
        <Label htmlFor={`${id}-priv`} className="text-base">
          나만 보기
        </Label>
        <span className="text-muted-foreground text-sm">
          {memo.priv ? "(어르신·가족에게 보이지 않아요)" : "(확정하면 어르신·가족 화면에도 나와요)"}
        </span>
      </div>
    </div>
  );
}
