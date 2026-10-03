// 운영진 · 장소 데이터: 장소 조사표 35칸을 그대로 고치고 새 장소를 넣는다.
// 표 · 검색 · 빠진 장소 보고 · 지도(빈 곳 = 새 장소, 점 = 열기) · 관광공사 가져오기 · CSV 내보내기/가져오기.
// 드롭다운 칸은 시트와 같은 목록만 고를 수 있고, 저장 전에 시트와 같은 규칙으로 검사한다.
import { useId, useMemo, useState } from "react";
import { AdminShell } from "./AdminShell";
import { CsvImport } from "./places/CsvImport";
import { PlaceEditor } from "./places/PlaceEditor";
import { PlaceTable } from "./places/PlaceTable";
import { filterRecords, nextId, type View } from "./places/placeForm";
import { PlacesSidePanel } from "./places/PlacesSidePanel";
import { SkippedReport } from "./places/SkippedReport";
import { AddIcon, DownloadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { emptyRecord, recordsToCsv, type PlaceRecord } from "@/shared/data/placeRecords";

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
  const hasMap = records.some((r) => Number(r.위도) && Number(r.경도)); // 지도는 좌표가 있어야 그린다

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
        title="시트에 붙여 넣을 CSV"
        disabled={records.length === 0}
        onClick={() => {
          downloadCsv(records);
        }}
      >
        <DownloadIcon size="sm" />
        CSV 내보내기
      </Button>
      <Button
        onClick={() => {
          openNew({ ...emptyRecord(), ID: nextId(records), 지역: "목포", 확인상태: "미확인" });
        }}
      >
        <AddIcon size="sm" />새 장소 만들기
      </Button>
    </div>
  ) : undefined;

  return (
    <AdminShell title="장소 데이터" actions={actions}>
      {data.isPending ? (
        <div role="status" aria-label="장소 데이터를 불러오는 중" className="flex flex-col gap-2">
          {SKELETON_ROWS.map((k) => (
            <Skeleton key={k} className="h-10 w-full" />
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
        <div className="flex flex-col gap-4">
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
          <p className="text-muted-foreground text-sm">
            {hasMap
              ? "표에서 장소를 고르거나 지도에서 새 위치를 눌러 주세요."
              : "표에서 장소를 고르거나 새 장소를 만들어 주세요."}{" "}
            조사표 35칸을 모두 고칠 수 있어요.
          </p>
          <SkippedReport skipped={loaded.skipped} records={records} onOpen={open} />
          <div className="grid items-start gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex min-w-48 flex-1 flex-col gap-1">
                    <Label htmlFor={`${ids}-q`}>검색</Label>
                    <Input
                      id={`${ids}-q`}
                      type="search"
                      placeholder="장소 · ID · 권역"
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`${ids}-view`}>보기</Label>
                    <Select
                      value={view}
                      onValueChange={(v) => {
                        setView(v as View);
                      }}
                    >
                      <SelectTrigger id={`${ids}-view`} className="w-44">
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
                  </div>
                </div>
                <p className="text-muted-foreground text-sm" aria-live="polite">
                  {rows.length}곳 보는 중 · 전체 {records.length}곳
                </p>
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
              </CardContent>
            </Card>

            <PlacesSidePanel records={records} onOpen={open} onNew={openNew} />
          </div>
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
