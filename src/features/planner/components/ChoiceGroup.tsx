// 단일 선택 묶음 (S1 ④~⑨): 기본 선택 없음, 고른 항목은 진하게. 같은 항목을 다시 눌러도 선택이 풀리지 않는다.
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface ChoiceOption<T> {
  value: T;
  label: string;
  /** 있으면 두 줄짜리 카드로 그린다 (이동 조건) */
  sub?: string;
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
      className={cn("w-full flex-wrap", cards && "grid grid-cols-1 items-stretch lg:grid-cols-3")}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={String(o.value)}
          value={String(o.value)}
          className={
            cards
              ? "h-auto min-h-16 w-full flex-col items-start justify-center gap-0.5 px-4 py-3 text-left whitespace-normal"
              : "min-w-20 rounded-full"
          }
        >
          {o.sub ? (
            <>
              <span className="text-lg font-bold">{o.label}</span>
              <span className="text-sm font-normal opacity-80">{o.sub}</span>
            </>
          ) : (
            o.label
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
