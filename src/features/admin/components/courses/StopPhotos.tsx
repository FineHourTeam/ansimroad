// 코스 장소 사진: 파일 올리기(여러 장) · 사진 주소 붙여 넣기 · 빼기
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { photoUrl } from "./draft";
import { useUploadCuratedPhoto } from "@/features/curated";
import { CloseIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prepareUploadImage } from "@/shared/lib/image";

export function StopPhotos({
  courseId,
  stopId,
  stopName,
  photos,
  onAdd,
  onRemove,
  onBusy,
}: {
  courseId: string;
  stopId: string;
  stopName: string;
  photos: string[];
  /** 올리기 시작(+1) · 끝(-1) — 끝나기 전에 다른 코스를 열면 사진이 빠지므로 페이지가 막는다 */
  onBusy: (delta: 1 | -1) => void;
  /** 올리는 동안 다른 칸을 고쳐도 덮어쓰지 않게, 바뀐 만큼만 알린다 */
  onAdd: (urls: string[]) => void;
  onRemove: (url: string) => void;
}) {
  const upload = useUploadCuratedPhoto();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    onBusy(1);
    const added: string[] = [];
    try {
      for (const f of files) {
        // 사진을 줄이고 EXIF(위치 정보)를 지운 JPEG 로 올린다
        const img = await prepareUploadImage(f, 1000, 0.8);
        added.push(await upload.mutateAsync({ courseId, file: img.blob }));
      }
    } catch {
      toast.error("사진을 넣지 못했어요. 다른 사진으로 해 주세요");
    } finally {
      setBusy(false);
      if (added.length > 0) onAdd(added);
      onBusy(-1);
    }
  };

  const addUrl = () => {
    const u = photoUrl(url);
    if (!u) {
      toast.error("사진 주소는 http:// 이나 https:// 로 시작해야 해요");
      return;
    }
    onAdd([u]);
    setUrl("");
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2" aria-label="사진">
        {photos.map((p, k) => (
          <li key={p} className="bg-muted relative h-24 w-32 overflow-hidden rounded-xl border">
            <img
              src={p}
              alt={`${stopName} 사진 ${String(k + 1)}`}
              referrerPolicy="no-referrer"
              className="size-full object-cover"
            />
            <Button
              variant="outline"
              size="icon-xs"
              className="absolute top-1 right-1"
              aria-label={`사진 ${String(k + 1)} 빼기`}
              onClick={() => {
                onRemove(p);
              }}
            >
              <CloseIcon />
            </Button>
          </li>
        ))}
        <li>
          <input
            ref={fileRef}
            id={`photo-file-${stopId}`}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void onFiles(e)}
          />
          <Button
            variant="outline"
            className="h-24 w-32 flex-col rounded-xl border-dashed"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <UploadIcon size="sm" />
            {busy ? "올리는 중이에요" : "사진 파일 올리기"}
          </Button>
        </li>
      </ul>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addUrl();
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label htmlFor={`photo-url-${stopId}`} className="text-muted-foreground text-sm">
            또는 사진 주소 붙여 넣기
          </Label>
          <Input
            id={`photo-url-${stopId}`}
            className="h-10"
            placeholder="https://…"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
            }}
          />
        </div>
        <Button type="submit" variant="outline" size="lg" className="h-10">
          추가하기
        </Button>
      </form>
    </div>
  );
}
