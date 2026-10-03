// 단일 선택 묶음 (S1 ④~⑨): 기본 선택 없음, 고른 항목은 청록으로 채운다. 같은 항목을 다시 눌러도 선택이 풀리지 않는다.
import { CheckIcon } from "@/components/icons";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface ChoiceOption<T> {
  value: T;
  label: string;
  /** 있으면 두 줄짜리 카드로 그린다 (이동 조건) */
  sub?: string;
}

/** 칩 수에 맞춘 칸: 같은 너비 알약이 카드 폭에 꼭 맞게 (5개는 휴대폰에서 3 + 2) */
function gridCols(n: number): string {
  if (n === 2) return "grid-cols-2";
  if (n === 4) return "grid-cols-2 lg:grid-cols-4";
  if (n >= 5) return "grid-cols-3 lg:grid-cols-5";
  return "grid-cols-3";
}

export function ChoiceGroup<T extends string | number>({
  options,
  value,
  onChange,
  labelledBy,
}: {
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (v: T) => void;
  labelledBy: string;
}) {
  const cards = options.some((o) => o.sub);
  return (
    <ToggleGroup
      type="single"
      variant="choice"
      size="xl"
      aria-labelledby={labelledBy}
      value={value === null ? "" : String(value)}
      onValueChange={(v) => {
        const picked = options.find((o) => String(o.value) === v);
        if (picked) onChange(picked.value);
      }}
      className={cn(
        "grid w-full items-stretch",
        cards ? "grid-cols-1 lg:grid-cols-3" : gridCols(options.length),
      )}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={String(o.value)}
          value={String(o.value)}
          className={
            cards
              ? "h-auto min-h-16 w-full justify-start gap-3 rounded-xl px-4 py-3 text-left whitespace-normal"
              : "w-full px-2"
          }
        >
          {o.sub ? (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-lg font-bold">{o.label}</span>
                <span className="text-muted-foreground group-data-[state=on]/toggle:text-primary-foreground text-sm font-normal">
                  {o.sub}
                </span>
              </span>
              {/* 라디오 동그라미: 고르면 흰 동그라미 안 체크 */}
              <span
                aria-hidden="true"
                className="border-input group-data-[state=on]/toggle:border-primary-foreground group-data-[state=on]/toggle:bg-primary-foreground group-data-[state=on]/toggle:text-primary grid size-6 shrink-0 place-items-center rounded-full border-2"
              >
                <CheckIcon size="sm" className="hidden group-data-[state=on]/toggle:block" />
              </span>
            </>
          ) : (
            o.label
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
