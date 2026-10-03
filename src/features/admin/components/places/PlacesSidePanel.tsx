// 장소 데이터 오른쪽 칸: 지도(빈 곳 = 새 장소, 회색 점 = 열기) + 한국관광공사에서 가져오기
import { useMemo } from "react";
import { toast } from "sonner";
import { nextId, placePoints, recordFrom } from "./placeForm";
import { TourImport } from "./TourImport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapView } from "@/shared/components/MapView";
import { emptyRecord, type PlaceRecord } from "@/shared/data/placeRecords";

export function PlacesSidePanel({
  records,
  onOpen,
  onNew,
}: {
  records: PlaceRecord[];
  onOpen: (r: PlaceRecord) => void;
  /** 새 장소 편집 시작 (지도에서 고른 좌표 또는 관광공사 값이 들어 있다) */
  onNew: (r: PlaceRecord) => void;
}) {
  const points = useMemo(() => placePoints(records), [records]);
  const blank = () => ({ ...emptyRecord(), ID: nextId(records), 지역: "목포", 확인상태: "미확인" });

  return (
    <div className="flex flex-col gap-4">
      {/* 좌표가 있는 장소가 하나도 없으면 지도 범위를 정할 수 없다 (시제품도 같다) */}
      {points.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>지도</CardTitle>
            <CardDescription>
              지도 빈 곳을 누르면 그 자리에 새 장소를 만들어요 · 회색 점을 누르면 그 장소를 열어요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MapView
              points={points}
              onSelect={(p) => {
                const r = records.find((x) => x.ID === p.id);
                if (r) onOpen(r);
              }}
              onMapClick={(lat, lng) => {
                onNew({ ...blank(), 위도: lat.toFixed(6), 경도: lng.toFixed(6) });
              }}
            />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>한국관광공사에서 가져오기</CardTitle>
          <CardDescription>
            장소명으로 찾아 새 장소로 가져와요. 접근성 · 안전 칸은 운영진이 확인해서 골라 주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TourImport
            records={records}
            mode="new"
            onPick={(fields) => {
              onNew(recordFrom({ ...emptyRecord(), ID: nextId(records) }, fields));
              toast.info("관광공사 정보를 가져왔어요. 권역 · 접근성 칸을 채운 뒤 저장해 주세요");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
