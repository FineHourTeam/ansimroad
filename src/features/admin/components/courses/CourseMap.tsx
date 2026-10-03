// 코스 지도: 회색 + 점(등록된 장소)을 누르면 코스에 넣고, 지도 빈 곳을 누르면 새 위치를 이름 붙여 넣는다.
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  CAND_PREFIX,
  coursePoints,
  MAX_STOPS,
  MAX_STOPS_MESSAGE,
  stopAt,
  stopFromPlace,
  type Pin,
} from "./draft";
import { paths } from "@/app/paths";
import { usePlaceData } from "@/features/places";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MapView } from "@/shared/components/MapView";
import type { CuratedStop } from "@/shared/domain/types";

export function CourseMap({
  stops,
  selectedId,
  onSelectStop,
  onAdd,
}: {
  stops: CuratedStop[];
  selectedId: string | null;
  onSelectStop: (id: string) => void;
  onAdd: (stop: CuratedStop) => void;
}) {
  const placeData = usePlaceData();
  const places = useMemo(() => placeData.data?.places ?? [], [placeData.data]);
  const [spot, setSpot] = useState<{ lat: number; lng: number } | null>(null);
  const [name, setName] = useState("");

  // 네이버 지도는 points 가 바뀔 때마다 다시 그린다 — 설명 · 사진을 고칠 때는 그대로 두게 위치 · 이름만 본다
  const pinsKey = JSON.stringify(
    stops.map((s): Pin => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng, placeId: s.placeId })),
  );
  const points = useMemo(
    () => coursePoints(JSON.parse(pinsKey) as Pin[], places),
    [pinsKey, places],
  );

  if (placeData.isPending) return <Skeleton className="aspect-video w-full" />;
  if (placeData.isError) {
    return (
      <div className="bg-background flex flex-col items-center gap-2 rounded-lg border px-4 py-10 text-center">
        <p className="text-destructive text-sm">
          장소 데이터를 불러오지 못했어요. 인터넷 연결을 확인해 주세요
        </p>
        <Button variant="outline" size="sm" onClick={() => void placeData.refetch()}>
          다시 불러오기
        </Button>
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div className="bg-background flex flex-col items-center gap-2 rounded-lg border px-4 py-10 text-center">
        <p className="text-sm">지도에 넣을 장소가 아직 없어요. 장소 데이터를 먼저 넣어 주세요.</p>
        <Button variant="outline" size="sm" asChild>
          <Link to={paths.adminPlaces}>장소 데이터로 가기</Link>
        </Button>
      </div>
    );
  }

  const addSpot = () => {
    if (!spot) return;
    onAdd(
      stopAt(
        name.trim() || `새 장소 ${String(stops.length + 1)}`,
        spot.lat,
        spot.lng,
        stops.length,
      ),
    );
    setSpot(null);
  };

  // 10곳을 넘으면 확정할 때 보안 규칙이 막으므로 넣기 전에 알려 준다
  const full = () => {
    if (stops.length < MAX_STOPS) return false;
    toast.error(MAX_STOPS_MESSAGE);
    return true;
  };

  return (
    <>
      <MapView
        className="bg-background"
        points={points}
        selectedId={selectedId}
        onSelect={(p) => {
          if (!p.id) return;
          if (p.id.startsWith(CAND_PREFIX)) {
            if (full()) return;
            const place = places.find((x) => `${CAND_PREFIX}${x.id}` === p.id);
            if (place) onAdd(stopFromPlace(place, stops.length));
          } else onSelectStop(p.id);
        }}
        onMapClick={(lat, lng) => {
          if (full()) return;
          setName(`새 장소 ${String(stops.length + 1)}`);
          setSpot({ lat, lng });
        }}
      />
      <Dialog
        open={spot !== null}
        onOpenChange={(open) => {
          if (!open) setSpot(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              addSpot();
            }}
          >
            <DialogHeader>
              <DialogTitle>새 위치 추가하기</DialogTitle>
              <DialogDescription>
                장소 데이터에 없는 곳이라 접근성 정보와 확인 배지가 붙지 않아요.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-spot-name">장소 이름</Label>
              <Input
                id="new-spot-name"
                maxLength={30}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  닫기
                </Button>
              </DialogClose>
              <Button type="submit">추가하기</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
