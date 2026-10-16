// ③ 사진 남기기 → ⑤ 완료 피드백 (F-17 · F-18 · F-19). 촬영 시각은 올릴 때 기록한 시각 (EXIF 아님)
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { locate, withTimeout } from "../seniorView";
import { useAddPhoto, useRecordLocationEvent } from "@/features/trip";
import type { ConsentChoice, Course } from "@/shared/domain/types";
import { failReason, track } from "@/shared/lib/analytics";
import { now } from "@/shared/lib/clock";
import { isoToHhmm } from "@/shared/lib/date";
import { prepareUploadImage } from "@/shared/lib/image";
import { matchLocation } from "@/shared/engine/timeline";

export type ShootPhase =
  { kind: "idle" } | { kind: "sending" } | { kind: "sent"; at: string } | { kind: "failed" };

const SENT_MS = 3000; // '자녀에게 보냈어요'를 보여 주는 시간
// 연결이 끊기면 SDK 가 오래(최대 10분) 다시 시도한다 — 30초에 끊고 '다시 눌러 주세요'를 보인다
const SEND_TIMEOUT_MS = 30_000;

export function useSeniorPhoto(opts: {
  tripId: string;
  course: Course;
  consent: ConsentChoice;
  locationOn: boolean;
  photoMaxPx: number;
}) {
  const { tripId, course, consent, locationOn, photoMaxPx } = opts;
  const addPhoto = useAddPhoto(tripId, "senior");
  const recordLocation = useRecordLocationEvent(tripId);
  const timer = useRef<number | undefined>(undefined);
  const [phase, setPhase] = useState<ShootPhase>({ kind: "idle" });
  const [noLocationNote, setNoLocationNote] = useState(false);
  // 위치 ON이고 마지막 사진 위치가 코스 장소 300m 안이면 그곳을 '지금 여기'로 (② 비고)
  const [nowOverride, setNowOverride] = useState<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 사진을 다시 골라도 change 가 일어나도록
    if (!file) return;
    window.clearTimeout(timer.current);
    setPhase({ kind: "sending" });
    const takenAt = now().toISOString();
    try {
      const [img, loc] = await Promise.all([
        prepareUploadImage(file, photoMaxPx),
        locate(locationOn, consent),
      ]);
      await withTimeout(
        addPhoto.mutateAsync({
          blob: img.blob,
          width: img.width,
          height: img.height,
          takenAt,
          ...loc,
        }),
        SEND_TIMEOUT_MS,
      );
      if (loc.locationStatus === "ok") {
        // D-08 수집 사실 기록(좌표 제외). 기록 실패가 사진 전송 실패는 아니다
        await recordLocation.mutateAsync("collect").catch(() => undefined);
      }
      if (locationOn) {
        const m = matchLocation(course, loc);
        setNowOverride(m.kind === "matched" ? m.index : undefined);
      }
      if (loc.locationStatus === "denied") setNoLocationNote(true);
      track("photo_upload");
      setPhase({ kind: "sent", at: isoToHhmm(takenAt) });
      timer.current = window.setTimeout(() => {
        setPhase({ kind: "idle" });
      }, SENT_MS);
    } catch (err) {
      track("photo_upload_fail", { by: "senior", reason: failReason(err) });
      setPhase({ kind: "failed" });
    }
  }

  return { phase, noLocationNote, nowOverride, onFile };
}
