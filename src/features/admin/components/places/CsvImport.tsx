// CSV 가져오기: 조사표 CSV(구글시트 내보내기) → 미리 보기(몇 곳 · 덮어쓰기 · 빠질 곳) → 한 번에 넣기
import { useRef, useState } from "react";
import { toast } from "sonner";
import { csvPreview, type CsvPreview } from "./placeForm";
import { UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useImportPlaces } from "@/features/places";
import { parseCsv } from "@/shared/data/csv";
import { toRecords, type PlaceRecord } from "@/shared/data/placeRecords";

export function CsvImport({ existing }: { existing: PlaceRecord[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<(CsvPreview & { fileName: string; total: number }) | null>(
    null,
  );
  const imp = useImportPlaces();

  const read = async (file: File) => {
    let records: PlaceRecord[];
    try {
      records = toRecords(parseCsv(await file.text()));
    } catch {
      toast.error("파일을 읽지 못했어요. CSV 파일인지 확인해 주세요");
      return;
    }
    if (records.length === 0) {
      toast.error("ID · 장소명 머리줄을 찾지 못했어요. 조사표 CSV인지 확인해 주세요");
      return;
    }
    imp.reset();
    setPreview({ ...csvPreview(records, existing), fileName: file.name, total: records.length });
  };

  const run = () => {
    if (!preview) return;
    imp.mutate(preview.ok, {
      onSuccess: (n) => {
        toast.success(`장소 ${String(n)}곳을 넣었어요 · 코스 생성에 바로 반영돼요`);
        setPreview(null);
      },
    });
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-label="CSV 파일 고르기"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // 같은 파일을 다시 골라도 읽히게
          if (file) void read(file);
        }}
      />
      <Button
        variant="outline"
        size="lg"
        onClick={() => {
          fileRef.current?.click();
        }}
      >
        <UploadIcon size="sm" />
        CSV 가져오기
      </Button>

      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open && !imp.isPending) setPreview(null);
        }}
      >
        {preview && (
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>CSV 가져오기</DialogTitle>
              <DialogDescription>
                {preview.fileName} · {preview.total}행을 읽었어요. 같은 ID는 덮어써요.
              </DialogDescription>
            </DialogHeader>
            <ul className="flex flex-col gap-1 text-sm">
              <li>
                넣을 장소 <strong>{preview.ok.length}곳</strong>
                {preview.overwrite > 0 &&
                  ` (이미 있는 장소 ${String(preview.overwrite)}곳은 덮어써요)`}
              </li>
              {preview.badIds > 0 && (
                <li className="text-destructive">
                  ID가 비었거나 &apos;/&apos;·공백이 있어 빼는 행 {preview.badIds}개
                </li>
              )}
              {preview.skipped.length > 0 && (
                <li className="flex flex-col gap-1">
                  <span className="text-destructive">
                    저장은 되지만 코스 생성에서 빠질 곳 {preview.skipped.length}곳 · 표에서 고치면
                    들어가요
                  </span>
                  <ul className="text-muted-foreground flex flex-col gap-1 pl-4 text-xs">
                    {preview.skipped.slice(0, 5).map((s) => (
                      <li key={`${s.id}-${String(s.row)}`}>
                        {s.id} · {s.reason}
                      </li>
                    ))}
                    {preview.skipped.length > 5 && <li>외 {preview.skipped.length - 5}곳</li>}
                  </ul>
                </li>
              )}
            </ul>
            {imp.isError && (
              <p role="alert" className="text-destructive text-sm font-semibold">
                넣지 못했어요. 인터넷 연결이나 운영진 권한을 확인하고 다시 눌러 주세요
              </p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={imp.isPending}>
                  닫기
                </Button>
              </DialogClose>
              <Button disabled={imp.isPending || preview.ok.length === 0} onClick={run}>
                {imp.isPending ? "넣는 중…" : `${String(preview.ok.length)}곳 가져오기`}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
