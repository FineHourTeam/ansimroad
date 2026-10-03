// ③ 사진 남기기 · ⑤ 완료 피드백 · ④ 응급실 전화 — 항상 화면에 보이도록 아래에 고정 (F-16: 누를 수 있는 것은 이 둘뿐)
import { useRef, type ChangeEvent } from "react";
import type { ShootPhase } from "../hooks/useSeniorPhoto";
import { erDisplayName } from "../seniorView";
import { SeniorDock } from "./SeniorMessage";
import { CameraIcon, CheckIcon, LoadingIcon, PhoneIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EmergencyInfo } from "@/shared/domain/types";
import { telHref } from "@/shared/lib/format";

export function PhotoDock({
  phase,
  canShoot,
  past,
  sentToday,
  noLocationNote,
  er,
  onFile,
}: {
  phase: ShootPhase;
  canShoot: boolean;
  /** 여행이 끝나 사진을 더 받지 않을 때 (잠긴 칸 안내가 달라진다) */
  past: boolean;
  sentToday: number;
  noLocationNote: boolean;
  er: EmergencyInfo | null;
  onFile: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = phase.kind === "sending";
  const locked = !canShoot && phase.kind !== "sent" && !busy;

  return (
    <SeniorDock>
      {/* 카메라: display:none 이면 iOS 에서 .click() 이 막히므로 sr-only 로 숨긴다.
          capture 를 모르는 기기(PC · 일부 인앱 브라우저)는 사진 고르기 창이 대신 열린다 */}
      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void onFile(e)}
      />
      {locked ? (
        <p className="border-foreground/40 bg-background-subtle flex h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center text-2xl font-extrabold">
          <CameraIcon className="size-10" />
          {past ? "여행이 끝나 사진은 더 보낼 수 없어요" : "여행 당일에 눌러 주세요"}
        </p>
      ) : (
        <Button
          size="senior-hero"
          // 보낸 뒤에는 초록으로 바꿔 '잘 갔다'를 색으로도 알린다
          className={cn(
            "w-full",
            phase.kind === "sent" && "bg-success text-success-foreground hover:bg-success",
          )}
          // 보내는 중에도 글자가 흐려지지 않게 disabled 대신 aria-disabled + 누름 무시
          aria-disabled={busy}
          aria-busy={busy}
          onClick={() => {
            if (!busy) fileRef.current?.click();
          }}
        >
          <ShootFace phase={phase} />
        </Button>
      )}
      {sentToday > 0 && (
        <p className="text-center text-2xl font-bold">오늘 사진 {sentToday}장 보냈어요</p>
      )}
      {noLocationNote && <p className="text-center text-2xl font-bold">위치 없이 저장했어요</p>}
      {er && (
        <Button
          asChild
          size="senior"
          variant="emergency"
          // 두 줄(응급실 전화 + 병원 이름)이라 높이는 내용에 맞춰 늘어난다 (최소 64px)
          className="h-auto min-h-16 w-full flex-col gap-0.5 py-2 text-center whitespace-normal"
        >
          <a href={telHref(er.phone)}>
            <span className="flex items-center gap-2 text-2xl font-extrabold">
              <PhoneIcon className="size-7" />
              응급실 전화
            </span>
            <span className="text-center text-xl font-semibold">
              {erDisplayName(er.name)}
              {er.driveMin !== null ? ` · 차로 ${String(er.driveMin)}분` : ""}
            </span>
          </a>
        </Button>
      )}
    </SeniorDock>
  );
}

/** 버튼 안 아이콘 + 문구. 문구가 바뀌어도 버튼 높이는 그대로 (두 줄까지) */
function ShootFace({ phase }: { phase: ShootPhase }) {
  let icon = <CameraIcon className="size-10" />;
  let label = <>사진 남기기</>;
  if (phase.kind === "sending") {
    icon = <LoadingIcon className="size-10 animate-spin" />;
    label = <>보내는 중이에요…</>;
  } else if (phase.kind === "sent") {
    icon = <CheckIcon className="size-12" />;
    // 두 덩어리로 나눠 좁은 폭에서도 깔끔하게 두 줄로 접힌다
    label = (
      <>
        <span className="whitespace-nowrap">자녀에게 보냈어요</span>{" "}
        <span className="whitespace-nowrap">· {phase.at}</span>
      </>
    );
  } else if (phase.kind === "failed") {
    label = <>다시 눌러 주세요</>;
  }
  return (
    <>
      {icon}
      <span aria-live="polite">{label}</span>
    </>
  );
}
