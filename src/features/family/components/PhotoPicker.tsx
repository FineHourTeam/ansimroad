// 파일 입력은 display:none 대신 sr-only (일부 iOS · WebView 는 숨긴 입력의 .click() 을 막는다)
// 장소 칸을 누르면 카메라 · 앨범 중 고르는 창이 뜬다. 고른 사진은 그 장소 칸에 바로 붙는다.
import { useRef, type ChangeEvent } from "react";
import { CameraIcon, ImageIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function PhotoPicker({
  open,
  placeName,
  onOpenChange,
  onFiles,
}: {
  open: boolean;
  placeName: string;
  onOpenChange: (open: boolean) => void;
  onFiles: (files: File[]) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // 같은 사진을 다시 골라도 change 가 일어나도록
    if (files.length > 0) onFiles(files);
  };
  const choose = (input: HTMLInputElement | null) => {
    input?.click();
    onOpenChange(false);
  };

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="카메라로 찍은 사진"
        tabIndex={-1}
        onChange={onChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="앨범에서 고른 사진"
        tabIndex={-1}
        onChange={onChange}
      />
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="mx-auto max-w-3xl rounded-t-xl pb-6">
          <SheetHeader>
            <SheetTitle className="text-lg">{placeName} 사진 올리기</SheetTitle>
            <SheetDescription>올린 사진은 이 장소 칸에 바로 붙어요.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4">
            <Button
              size="cta"
              onClick={() => {
                choose(cameraRef.current);
              }}
            >
              <CameraIcon />
              카메라로 찍기
            </Button>
            <Button
              variant="outline"
              size="cta"
              onClick={() => {
                choose(galleryRef.current);
              }}
            >
              <ImageIcon />
              앨범에서 고르기
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
