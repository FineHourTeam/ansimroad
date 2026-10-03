// 조사표 한 칸: 드롭다운 칸은 시트와 같은 목록(Select), 숫자 칸은 숫자 입력, 긴 칸은 여러 줄
import { useId } from "react";
import { REQUIRED_COLS, type Field } from "./placeForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ENUMS, type Column } from "@/shared/data/placeSchema";

const EMPTY = "__empty"; // Select 는 빈 문자열 값을 못 쓴다

export function PlaceField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (col: Column, v: string) => void;
}) {
  const id = useId();
  const hintId = field.hint ? `${id}-hint` : undefined;
  const opts = (ENUMS as Partial<Record<Column, readonly string[]>>)[field.col];
  const set = (v: string) => {
    onChange(field.col, v);
  };
  // 숫자 칸이라도 '1,200' 같은 값이 들어 있으면 그대로 보이게 글자 입력으로
  const numeric = field.type === "num" && (value === "" || Number.isFinite(Number(value)));

  return (
    <div className={cn("flex flex-col gap-1", field.type === "long" && "sm:col-span-2")}>
      <Label htmlFor={id}>
        {field.label ?? field.col}
        {REQUIRED_COLS.includes(field.col) && (
          <>
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
            <span className="sr-only">(필수)</span>
          </>
        )}
      </Label>
      {opts ? (
        <Select
          value={value || EMPTY}
          onValueChange={(v) => {
            set(v === EMPTY ? "" : v);
          }}
        >
          <SelectTrigger id={id} aria-describedby={hintId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY}>(비움)</SelectItem>
            {/* 시트 목록에 없는 값도 그대로 보여 준다 (저장 전 검사가 알려 준다) */}
            {value && !opts.includes(value) && <SelectItem value={value}>{value}</SelectItem>}
            {opts.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "long" ? (
        <Textarea
          id={id}
          aria-describedby={hintId}
          rows={2}
          value={value}
          onChange={(e) => {
            set(e.target.value);
          }}
        />
      ) : (
        <Input
          id={id}
          aria-describedby={hintId}
          type={field.type === "date" ? "date" : numeric ? "number" : "text"}
          step={numeric ? "any" : undefined}
          inputMode={field.type === "num" ? "decimal" : undefined}
          // 숫자 칸에 커서를 둔 채 시트를 휠로 내리면 값이 1씩 바뀐다 (위도 1 = 약 111km) → 휠이 오면 놓는다
          onWheel={
            numeric
              ? (e) => {
                  e.currentTarget.blur();
                }
              : undefined
          }
          value={field.type === "date" ? value.slice(0, 10) : value}
          onChange={(e) => {
            set(e.target.value);
          }}
        />
      )}
      {field.hint && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {field.hint}
        </p>
      )}
    </div>
  );
}
