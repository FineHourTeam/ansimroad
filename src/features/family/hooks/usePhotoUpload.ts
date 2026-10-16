// 자녀가 장소 칸을 눌러 올리는 사진: 기기에서 EXIF를 지우고 줄인 뒤(shared/lib/image) 고른 장소 순번에 붙인다.
import { useState } from "react";
import { toast } from "sonner";
import { useAddPhoto } from "@/features/trip";
import { failReason, track } from "@/shared/lib/analytics";
import { now } from "@/shared/lib/clock";
import { prepareUploadImage } from "@/shared/lib/image";

export type UploadState =
  { kind: "idle" } | { kind: "sending"; stopIndex: number } | { kind: "error"; stopIndex: number };

export function usePhotoUpload(tripId: string, maxPx: number) {
  const add = useAddPhoto(tripId, "family");
  const [state, setState] = useState<UploadState>({ kind: "idle" });

  const upload = async (files: File[], stopIndex: number) => {
    if (files.length === 0) return;
    setState({ kind: "sending", stopIndex });
    try {
      for (const file of files) {
        const img = await prepareUploadImage(file, maxPx);
        await add.mutateAsync({
          blob: img.blob,
          width: img.width,
          height: img.height,
          takenAt: now().toISOString(),
          lat: null,
          lng: null,
          locationStatus: "off",
          stopIndex,
        });
      }
      setState({ kind: "idle" });
      toast.success(`사진 ${String(files.length)}장을 올렸어요`);
    } catch (err) {
      track("photo_upload_fail", { by: "family", reason: failReason(err) });
      setState({ kind: "error", stopIndex });
    }
  };

  return { state, upload };
}
