// S1 ④~⑨ 조건 6가지. 미입력 강조는 제목 빨간색 + '선택해 주세요' (팝업 없음)
import { useState, type ReactNode } from "react";
import { CalendarIcon, InfoIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { TripInputDraft } from "@/shared/domain/types";
import { longDate } from "@/shared/lib/date";
import {
  AGE_OPTIONS,
  MOBILITY_OPTIONS,
  PARTY_OPTIONS,
  TRANSPORT_OPTIONS,
  WALK_OPTIONS,
} from "@/shared/lib/format";
import { FIELD_TITLES, type FieldKey } from "../lib/fields";
import { ChoiceGroup } from "./ChoiceGroup";

function Field({
  k,
  missing,
  htmlFor,
  aside,
  children,
}: {
  k: FieldKey;
  missing: boolean;
  /** 입력칸이 있으면 제목을 그 칸의 라벨로 */
  htmlFor?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const title = FIELD_TITLES[k];
  return (
    <section
      id={`field-${k}`}
      aria-labelledby={`t-${k}`}
      className="flex scroll-mt-20 flex-col gap-3"
    >
      <div className="flex min-h-12 flex-wrap items-center gap-2">
        <h2 id={`t-${k}`} className={cn("text-lg font-bold", missing && "text-destructive")}>
          {htmlFor ? (
            <Label htmlFor={htmlFor} className="text-lg font-bold">
              {title}
            </Label>
          ) : (
            title
          )}
        </h2>
        {missing && <Badge variant="destructive">선택해 주세요</Badge>}
        {aside}
      </div>
      {children}
    </section>
  );
}

export function TripFields({
  draft,
  set,
  missing,
  today,
}: {
  draft: TripInputDraft;
  set: <K extends FieldKey>(k: K, v: TripInputDraft[K]) => void;
  missing: FieldKey | null;
  today: string;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [dateError, setDateError] = useState(false);

  const onDate = (v: string) => {
    // iOS 사파리 등 min 을 무시하는 브라우저 대비 (⑧ 오늘 이후만)
    if (v !== "" && v < today) {
      setDateError(true);
      return;
    }
    setDateError(false);
    set("date", v === "" ? null : v);
  };

  return (
    <>
      <Field k="party" missing={missing === "party"}>
        <ChoiceGroup
          options={PARTY_OPTIONS}
          value={draft.party}
          onChange={(v) => {
            set("party", v);
          }}
          labelledBy="t-party"
        />
      </Field>

      <Field k="age" missing={missing === "age"}>
        <ChoiceGroup
          options={AGE_OPTIONS}
          value={draft.age}
          onChange={(v) => {
            set("age", v);
          }}
          labelledBy="t-age"
        />
      </Field>

      <Field k="mobility" missing={missing === "mobility"}>
        <ChoiceGroup
          options={MOBILITY_OPTIONS}
          value={draft.mobility}
          onChange={(v) => {
            set("mobility", v);
          }}
          labelledBy="t-mobility"
        />
      </Field>

      <Field
        k="walk"
        missing={missing === "walk"}
        aside={
          <Button
            type="button"
            variant="ghost"
            size="xl"
            aria-expanded={helpOpen}
            aria-controls="walk-help"
            onClick={() => {
              setHelpOpen((o) => !o);
            }}
          >
            <InfoIcon size="sm" />
            도움말
          </Button>
        }
      >
        <p id="walk-help" className="text-muted-foreground text-base" hidden={!helpOpen}>
          쉬지 않고 천천히 걸을 수 있는 시간
        </p>
        <ChoiceGroup
          options={WALK_OPTIONS}
          value={draft.walk}
          onChange={(v) => {
            set("walk", v);
          }}
          labelledBy="t-walk"
        />
      </Field>

      <Field k="date" missing={missing === "date"} htmlFor="trip-date">
        {/* 보이는 칸은 한국어 날짜, 실제 선택은 위에 투명하게 겹친 기본 날짜 입력 (휴대폰은 기본 달력이 열린다) */}
        <div
          className={cn(
            "border-input focus-within:border-ring focus-within:ring-ring/50 relative flex h-12 items-center gap-2 rounded-lg border px-3 focus-within:ring-3",
            dateError && "border-destructive",
          )}
        >
          <span
            aria-hidden="true"
            className={cn("flex-1 text-base", draft.date ? "font-bold" : "text-muted-foreground")}
          >
            {draft.date ? longDate(draft.date) : "날짜를 골라 주세요"}
          </span>
          <CalendarIcon className="text-primary" />
          <Input
            id="trip-date"
            type="date"
            min={today}
            value={draft.date ?? ""}
            className="absolute inset-0 h-full cursor-pointer opacity-0"
            aria-describedby={dateError ? "date-error" : undefined}
            aria-invalid={dateError || undefined}
            onChange={(e) => {
              onDate(e.target.value);
            }}
            onClick={(e) => {
              // PC 브라우저는 칸을 눌러도 달력이 안 열려서 직접 연다
              try {
                e.currentTarget.showPicker();
              } catch {
                // 이미 열려 있거나 지원하지 않는 브라우저 — 기본 동작 그대로
              }
            }}
          />
        </div>
        {dateError && (
          <p id="date-error" className="text-destructive text-base font-bold" role="alert">
            오늘 이후 날짜를 골라 주세요
          </p>
        )}
      </Field>

      <Field k="transport" missing={missing === "transport"}>
        <ChoiceGroup
          options={TRANSPORT_OPTIONS}
          value={draft.transport}
          onChange={(v) => {
            set("transport", v);
          }}
          labelledBy="t-transport"
        />
      </Field>
    </>
  );
}
