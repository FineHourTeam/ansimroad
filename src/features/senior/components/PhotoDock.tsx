// ③ 사진 남기기 · ⑤ 완료 피드백 · ④ 응급실 전화 — 항상 화면에 보이도록 아래에 고정 (F-16: 누를 수 있는 것은 이 둘뿐).
// 일정이 주인공이라 띠는 화면 높이의 1/4 안팎: 사진 버튼(120px, F-17) 한 줄 + 응급실 한 줄(64px). 오늘 보낸 수는 사진 버튼 안에.
import { useRef, type ChangeEvent } from "react";
import type { ShootPhase } from "../hooks/useSeniorPhoto";
import { erDisplayName } from "../seniorView";
import { SeniorDock } from "./SeniorMessage";
import { CameraIcon, CheckIcon, LoadingIcon, PhoneIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
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
      {noLocationNote && <p className="text-center text-xl font-bold">위치 없이 저장했어요</p>}
      {locked ? (
        <p className="border-input bg-background-subtle flex min-h-20 items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3 text-2xl leading-snug font-extrabold">
          <CameraIcon className="size-9 shrink-0" />
          {/* '보낼 / 수 없어요'로 끊기지 않게 */}
          <span>
            {past ? (
              <>
                여행이 끝나 사진은 더 <span className="whitespace-nowrap">보낼 수 없어요</span>
              </>
            ) : (
              "여행 당일에 눌러 주세요"
            )}
          </span>
        </p>
      ) : (
        <Button
          size="senior-hero"
          variant={phase.kind === "sent" ? "success" : "default"}
          // 한 줄 배치(아이콘 왼쪽 · 글자 오른쪽)로 높이를 120px(F-17 최소)에 맞춘다. 아주 좁은 폭에서만 글자만큼 늘어난다.
          // 보낸 뒤에는 초록으로 바꿔 '잘 갔다'를 색으로도 알린다
          className="h-auto min-h-30 w-full flex-row justify-start gap-3 px-4 py-2 text-left"
          // 보내는 중에도 글자가 흐려지지 않게 disabled 대신 aria-disabled + 누름 무시
          aria-disabled={busy}
          aria-busy={busy}
          onClick={() => {
            if (!busy) fileRef.current?.click();
          }}
        >
          <ShootFace phase={phase} sentToday={sentToday} />
        </Button>
      )}
      {er && (
        <Button
          asChild
          size="senior"
          variant="emergency"
          // 두 줄(응급실 전화 + 병원 이름)을 64px 안에. 이름이 길면 높이가 늘어난다
          className="h-auto min-h-16 w-full justify-start gap-3 px-3 py-1 text-left whitespace-normal"
        >
          <a href={telHref(er.phone)}>
            <span className="bg-emergency text-emergency-foreground grid size-11 shrink-0 place-items-center rounded-full">
              <PhoneIcon className="size-6" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-2xl leading-7 font-extrabold">응급실 전화</span>
              <span className="text-xl leading-6 font-semibold">
                {erDisplayName(er.name)}
                {er.driveMin !== null ? ` · 차로 ${String(er.driveMin)}분` : ""}
              </span>
            </span>
          </a>
        </Button>
      )}
    </SeniorDock>
  );
}

/** 버튼 안: 동그라미 아이콘 + 문구 + 아랫줄(오늘 보낸 수, 보낸 직후에는 보낸 시각부터). 문구가 바뀌어도 버튼 높이는 그대로 */
function ShootFace({ phase, sentToday }: { phase: ShootPhase; sentToday: number }) {
  let icon = <CameraIcon className="size-8" />;
  let label = "사진 남기기";
  const count = sentToday > 0 ? `오늘 사진 ${String(sentToday)}장` : "";
  let sub = count && `${count} 보냈어요`;
  if (phase.kind === "sending") {
    icon = <LoadingIcon className="size-8 animate-spin" />;
    label = "보내는 중이에요…";
  } else if (phase.kind === "sent") {
    icon = <CheckIcon className="size-10" />;
    label = "자녀에게 보냈어요";
    // 시각은 아랫줄 맨 앞에: 윗줄 끝에 붙이면 좁은 폭에서 '· 12:20'만 다음 줄로 떨어진다
    sub = count ? `${phase.at} · ${count}` : phase.at;
  } else if (phase.kind === "failed") {
    label = "다시 눌러 주세요";
  }
  return (
    <>
      <span className="bg-primary-foreground/15 grid size-14 shrink-0 place-items-center rounded-full">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span aria-live="polite">{label}</span>
        {sub && <span className="text-xl leading-snug font-semibold tabular-nums">{sub}</span>}
      </span>
    </>
  );
}
