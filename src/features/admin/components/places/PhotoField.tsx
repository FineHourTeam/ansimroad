// 사진URL 칸 미리 보기 + 사진 올리기 (기기에서 줄이고 위치 정보를 지운 JPEG → Storage → 주소를 칸에 덧붙인다)
import { useRef, useState } from "react";
import { toast } from "sonner";
import { joinPhotos, splitPhotos } from "./placeForm";
import { CloseIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { isValidPlaceId, useUploadPlacePhoto } from "@/features/places";
import { prepareUploadImage } from "@/shared/lib/image";

const isWebUrl = (u: string) => /^https?:\/\//i.test(u);
// 관광공사 이미지 서버는 https 도 되므로 혼합 콘텐츠 차단을 피한다
const shown = (u: string) =>
  u.replace(/^http:\/\/tong\.visitkorea\.or\.kr/i, "https://tong.visitkorea.or.kr");

export function PhotoField({
  placeId,
  value,
  onChange,
}: {
  placeId: string;
  value: string;
  /** 이전 값을 받아 새 값을 돌려준다 (올리는 동안 다른 칸을 고쳐도 덮어쓰지 않게) */
  onChange: (update: (prev: string) => string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadPlacePhoto();
  // 여러 장을 차례로 올리는 동안 내내 막는다 (장 사이에 upload.isPending 이 잠깐 false 가 된다)
  const [busy, setBusy] = useState(false);
  const urls = splitPhotos(value);

  const addFiles = async (files: File[]) => {
    if (!isValidPlaceId(placeId)) {
      toast.error("ID를 먼저 정해 주세요. 사진은 ID 폴더에 올라가요");
      return;
    }
    const added: string[] = [];
    setBusy(true);
    try {
      for (const file of files) {
        const { blob } = await prepareUploadImage(file);
        added.push(await upload.mutateAsync({ placeId, file: blob }));
      }
    } catch {
      toast.error("사진을 올리지 못했어요. 인터넷 연결을 확인하고 다시 올려 주세요");
    } finally {
      setBusy(false);
    }
    if (added.length > 0) {
      onChange((prev) => joinPhotos([...splitPhotos(prev), ...added]));
      toast.success(`사진 ${String(added.length)}장을 올렸어요. 저장하면 반영돼요`);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {urls.filter(isWebUrl).map((u, i) => (
          <figure key={u} className="bg-muted relative m-0 h-20 w-28 overflow-hidden rounded-md">
            <img
              src={shown(u)}
              alt={`사진 ${String(i + 1)}`}
              referrerPolicy="no-referrer"
              className="size-full object-cover"
            />
            <Button
              variant="secondary"
              size="icon-xs"
              className="absolute top-1 right-1"
              aria-label={`사진 ${String(i + 1)} 빼기`}
              onClick={() => {
                onChange((prev) => joinPhotos(splitPhotos(prev).filter((x) => x !== u)));
              }}
            >
              <CloseIcon size="sm" />
            </Button>
          </figure>
        ))}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="장소 사진 파일 고르기"
        tabIndex={-1}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = ""; // 같은 파일을 다시 골라도 올라가게
          if (files.length > 0) void addFiles(files);
        }}
      />
      <Button
        variant="outline"
        className="self-start"
        disabled={busy}
        onClick={() => {
          fileRef.current?.click();
        }}
      >
        <UploadIcon size="sm" />
        {busy ? "올리는 중…" : "사진 올리기"}
      </Button>
    </div>
  );
}
