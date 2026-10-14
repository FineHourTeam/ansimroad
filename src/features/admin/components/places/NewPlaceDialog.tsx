// 새 장소 만들기: 두 방법 중 하나를 고른다 — 지도에서 위치 고르기(빈 곳 = 새 장소, 회색 점 = 그 장소 열기) · 한국관광공사에서 가져오기
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { nextId, placePoints, recordFrom } from "./placeForm";
import { TourImport } from "./TourImport";
import { AddIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapView } from "@/shared/components/MapView";
import { emptyRecord, type PlaceRecord } from "@/shared/data/placeRecords";

export function NewPlaceDialog({
  records,
  onOpen,
  onNew,
}: {
  records: PlaceRecord[];
  onOpen: (r: PlaceRecord) => void;
  /** 새 장소 편집 시작 (지도에서 고른 좌표 또는 관광공사 값이 들어 있다) */
  onNew: (r: PlaceRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const points = useMemo(() => placePoints(records), [records]);
  const blank = () => ({ ...emptyRecord(), ID: nextId(records), 지역: "목포", 확인상태: "미확인" });
  const done = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <AddIcon size="sm" />새 장소 만들기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>새 장소 만들기</DialogTitle>
          <DialogDescription>어떻게 만들지 골라 주세요</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="map">
          <TabsList className="w-full">
            <TabsTrigger value="map">지도에서 위치 고르기</TabsTrigger>
            <TabsTrigger value="tour">한국관광공사에서 가져오기</TabsTrigger>
          </TabsList>
          <TabsContent value="map" className="flex flex-col gap-3 pt-2">
            <p className="text-muted-foreground text-sm">
              지도 빈 곳을 누르면 그 자리에 새 장소를 만들어요 · 회색 점을 누르면 그 장소를 열어요
            </p>
            {/* 좌표가 있는 장소가 하나도 없으면 지도 범위를 정할 수 없다 → 빈 칸으로 시작 */}
            {points.length > 0 ? (
              <MapView
                // 네이버 지도 단추가 편집 시트 위로 올라오지 않게 쌓임 맥락을 가둔다
                className="isolate rounded-xl"
                points={points}
                onSelect={(p) => {
                  const r = records.find((x) => x.ID === p.id);
                  if (r)
                    done(() => {
                      onOpen(r);
                    });
                }}
                onMapClick={(lat, lng) => {
                  done(() => {
                    onNew({ ...blank(), 위도: lat.toFixed(6), 경도: lng.toFixed(6) });
                  });
                }}
              />
            ) : (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm">좌표가 있는 장소가 아직 없어서 지도를 그릴 수 없어요.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    done(() => {
                      onNew(blank());
                    });
                  }}
                >
                  빈 칸으로 시작하기
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="tour" className="pt-2">
            <TourImport
              records={records}
              mode="new"
              onPick={(fields) => {
                done(() => {
                  onNew(recordFrom({ ...emptyRecord(), ID: nextId(records) }, fields));
                });
                toast.info("관광공사 정보를 가져왔어요. 권역 · 접근성 칸을 채운 뒤 저장해 주세요");
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
