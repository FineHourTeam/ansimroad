// 운영진 · 장소 데이터: 장소 조사표 35칸을 그대로 고치고 새 장소를 넣는다.
// 표 · 검색 · 빠진 장소 보고 · 새 장소(지도에서 고르기 / 관광공사 가져오기 중 선택) · CSV 내보내기/가져오기.
// 드롭다운 칸은 시트와 같은 목록만 고를 수 있고, 저장 전에 시트와 같은 규칙으로 검사한다.
import { useId, useMemo, useState } from "react";
import { AdminShell } from "./AdminShell";
import { CsvImport } from "./places/CsvImport";
import { PlaceEditor } from "./places/PlaceEditor";
import { PlaceTable } from "./places/PlaceTable";
import { NewPlaceDialog } from "./places/NewPlaceDialog";
import { filterRecords, type View } from "./places/placeForm";
import { SkippedReport } from "./places/SkippedReport";
import { DownloadIcon, SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaceData } from "@/features/places";
import { StateMessage } from "@/shared/components/common";
import { recordsToCsv, type PlaceRecord } from "@/shared/data/placeRecords";

const NO_RECORDS: PlaceRecord[] = [];
const VIEWS: { value: View; label: string }[] = [
  { value: "all", label: "전체 장소" },
  { value: "skipped", label: "코스에서 빠진 곳" },
  { value: "unverified", label: "확인 안 된 곳" },
];
const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"];

function downloadCsv(records: PlaceRecord[]) {
  // 시트에 그대로 붙여 넣을 CSV (엑셀 한글이 깨지지 않게 BOM 포함)
  const url = URL.createObjectURL(
    new Blob([recordsToCsv(records)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "places.csv";
  a.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

export function AdminPlacesPage() {
  const ids = useId();
  const data = usePlaceData();
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("all");
  const [editing, setEditing] = useState<{ record: PlaceRecord; isNew: boolean } | null>(null);

  const loaded = data.data;
  const records = loaded?.records ?? NO_RECORDS;
  const skipped = useMemo(
    () => new Map((loaded?.skipped ?? []).map((s) => [s.id, s.reason])),
    [loaded],
  );
  const rows = useMemo(() => filterRecords(records, q, view, skipped), [records, q, view, skipped]);

  const open = (r: PlaceRecord) => {
    setEditing({ record: { ...r }, isNew: false });
  };
  const openNew = (r: PlaceRecord) => {
    setEditing({ record: r, isNew: true });
  };

  // 다시 읽기만 실패했으면 가진 데이터로 계속 보여 준다
  const actions = loaded ? (
    <div className="flex flex-wrap gap-2">
      <CsvImport existing={records} />
      <Button
        variant="outline"
        size="lg"
        title="시트에 붙여 넣을 CSV"
        disabled={records.length === 0}
        onClick={() => {
          downloadCsv(records);
        }}
      >
        <DownloadIcon size="sm" />
        CSV 내보내기
      </Button>
      <NewPlaceDialog records={records} onOpen={open} onNew={openNew} />
    </div>
  ) : undefined;

  return (
    <AdminShell title="장소 데이터" actions={actions}>
      {data.isPending ? (
        <div role="status" aria-label="장소 데이터를 불러오는 중" className="flex flex-col gap-2">
          {SKELETON_ROWS.map((k) => (
            <Skeleton key={k} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : !loaded ? (
        <Card>
          <StateMessage title="장소 데이터를 읽지 못했어요">
            <p className="text-muted-foreground">인터넷 연결을 확인하고 다시 불러와 주세요</p>
            <Button
              onClick={() => {
                void data.refetch();
              }}
            >
              다시 불러오기
            </Button>
          </StateMessage>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {data.isError && (
            <div role="alert" className="flex flex-wrap items-center gap-2">
              <p className="text-destructive text-sm font-semibold">
                최신 장소 데이터를 다시 읽지 못했어요
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void data.refetch();
                }}
              >
                다시 불러오기
              </Button>
            </div>
          )}
          <p className="text-muted-foreground -mt-3 text-sm">
            표에서 장소를 고르거나 새 장소를 만들어 주세요. 조사표 35칸을 모두 고칠 수 있어요.
          </p>
          <SkippedReport skipped={loaded.skipped} records={records} onOpen={open} />
          <Card className="gap-0 py-0">
            <div className="flex flex-wrap items-center gap-3 border-b p-4">
              <div className="relative min-w-48 flex-1">
                <Label htmlFor={`${ids}-q`} className="sr-only">
                  검색
                </Label>
                <SearchIcon
                  size="sm"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                />
                <Input
                  id={`${ids}-q`}
                  type="search"
                  className="h-10 pl-9"
                  placeholder="장소명 · ID · 권역으로 찾기"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                  }}
                />
              </div>
              <Label htmlFor={`${ids}-view`} className="sr-only">
                보기
              </Label>
              <Select
                value={view}
                onValueChange={(v) => {
                  setView(v as View);
                }}
              >
                <SelectTrigger id={`${ids}-view`} className="w-44 data-[size=default]:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIEWS.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
                {rows.length}곳 보는 중 · 전체 {records.length}곳
              </p>
            </div>
            {records.length === 0 ? (
              <StateMessage title="아직 장소가 없어요">
                <p className="text-muted-foreground">
                  새 장소를 만들거나 조사표 CSV · 관광공사 정보를 가져와 주세요
                </p>
              </StateMessage>
            ) : rows.length === 0 ? (
              <StateMessage title="찾는 장소가 없어요">
                <p className="text-muted-foreground">
                  검색어를 짧게 바꾸거나 보기를 전체로 바꿔 보세요
                </p>
              </StateMessage>
            ) : (
              <PlaceTable rows={rows} skipped={skipped} onOpen={open} />
            )}
          </Card>
        </div>
      )}
      {editing && (
        <PlaceEditor
          key={`${editing.record.ID}-${String(editing.isNew)}`}
          initial={editing.record}
          isNew={editing.isNew}
          records={records}
          onOpen={open}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
    </AdminShell>
  );
}
