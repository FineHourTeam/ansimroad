// S5 자녀 현황: 예정 vs 실제(사진)를 나란히 보고 '지금 어디쯤인지' 3초 안에 안다.
// F-21 타임라인 · F-22 배너(실시간) · F-24 위치 설정(기본 OFF) · D-08 위치 제공 기록
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePhotos, useRecordLocationEvent, useReviews, useUpdateCourse } from "@/features/trip";
import { EmergencyLine, LegalLinks, Loading } from "@/shared/components/common";
import { MapView } from "@/shared/components/MapView";
import type { Course, Settings, TripAccess, TripSnapshot } from "@/shared/domain/types";
import { nowLinePosition, photosBySlot } from "@/shared/engine/timeline";
import { changeStay } from "@/shared/lib/courseEdit";
import { hhmm, koreanMonthDay, minutesOfDay, toLocalYmd } from "@/shared/lib/date";
import { courseMapPoints } from "@/shared/lib/mapPoints";
import { useNow } from "../hooks/useNow";
import { usePhotoUpload } from "../hooks/usePhotoUpload";
import { bannerText, isPast } from "../lib/familyView";
import { CompleteTrip } from "./CompleteTrip";
import { CourseHeader, StartAdjust } from "./CourseControls";
import { PhotoPicker } from "./PhotoPicker";
import { FamilyLinks, ReportCard, SendCard } from "./SendCard";
import { StatusBanner } from "./StatusBanner";
import { Timeline } from "./Timeline";

export function FamilyDashboard({
  trip,
  access,
  settings,
}: {
  trip: TripSnapshot;
  access: TripAccess;
  settings: Settings;
}) {
  const { course, tripId } = trip;
  const token = access.token;
  const locationOn = settings.locationCollectionEnabled;
  const photosQ = usePhotos(tripId);
  const reviewsQ = useReviews(tripId, false);
  const update = useUpdateCourse(tripId, !!trip.completedAt);
  const { mutate: recordLocation } = useRecordLocationEvent(tripId);
  const { state: upload, upload: uploadFiles } = usePhotoUpload(tripId, settings.photoMaxPx);
  const [picker, setPicker] = useState({ open: false, index: 0 });
  const points = useMemo(() => courseMapPoints(course, settings), [course, settings]);

  const current = useNow();
  const today = toLocalYmd(current);
  const nowMin = minutesOfDay(current);
  const date = trip.input.date;
  const photos = useMemo(() => photosQ.data ?? [], [photosQ.data]);
  const slots = useMemo(
    () => photosBySlot(course, photos, locationOn),
    [course, photos, locationOn],
  );

  // D-08: 위치 ON 이고 위치가 있는 사진을 보여 줄 때만 '제공' 기록 (좌표 제외)
  const located = photos.filter((p) => p.lat !== null && p.lng !== null).length;
  useEffect(() => {
    if (locationOn && located > 0) recordLocation("provide");
  }, [locationOn, located, recordLocation]);

  const apply = (next: Course) => {
    update.mutate(next, {
      onError: () => {
        toast.error("일정을 저장하지 못했어요. 다시 눌러 주세요");
      },
    });
  };

  const showComplete = !trip.completedAt && (today >= date || photos.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <CourseHeader date={date} course={course} onChange={apply} />
      {trip.reportToken && <ReportCard reportToken={trip.reportToken} />}
      {!trip.reportToken && today < date && access.seniorToken ? (
        <SendCard
          trip={trip}
          seniorToken={access.seniorToken}
          token={token}
          printOn={settings.printViewEnabled}
        />
      ) : (
        <FamilyLinks token={token} printOn={settings.printViewEnabled} />
      )}

      <MapView points={points} />

      {photosQ.isPending ? (
        <Loading text="사진을 확인하는 중이에요" />
      ) : photosQ.isError ? (
        <div role="alert" className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="font-bold">사진을 불러오지 못했어요</p>
          <Button variant="outline" size="xl" onClick={() => void photosQ.refetch()}>
            다시 불러오기
          </Button>
        </div>
      ) : (
        <StatusBanner
          banner={bannerText({
            course,
            date,
            expiresOn: trip.expiresOn,
            photos,
            locationOn,
            today,
            nowMin,
            completed: !!trip.completedAt,
          })}
        />
      )}

      <StartAdjust course={course} onChange={apply} />

      {photosQ.isSuccess && (
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">사진 {photos.length}장</h2>
          <p className="text-muted-foreground text-sm">새 사진은 바로 보여요</p>
        </div>
      )}
      {photosQ.isSuccess && photos.length === 0 && (
        <p className="bg-background-subtle rounded-lg px-4 py-3 text-center">
          아직 올라온 사진이 없어요. 장소 칸을 눌러 사진을 올려 보세요.
        </p>
      )}
      <Timeline
        course={course}
        memos={trip.memos}
        slots={slots}
        nowPos={today === date ? nowLinePosition(course, nowMin) : null}
        nowLabel={hhmm(nowMin)}
        isPastMin={(min) => isPast(today, date, min, nowMin)}
        locationOn={locationOn}
        upload={upload}
        onPick={(index) => {
          setPicker({ open: true, index });
        }}
        onStay={(i, delta) => {
          apply(changeStay(course, i, delta));
        }}
      />
      <PhotoPicker
        open={picker.open}
        placeName={course.stops[picker.index]?.place.name ?? ""}
        onOpenChange={(open) => {
          setPicker((p) => ({ ...p, open }));
        }}
        onFiles={(files) => void uploadFiles(files, picker.index)}
      />
      <p className="text-muted-foreground text-center text-sm">
        사진과 링크를 볼 수 있는 마지막 날 · {koreanMonthDay(trip.expiresOn)}
      </p>

      {showComplete && (
        <CompleteTrip
          trip={trip}
          reviews={reviewsQ.data ?? {}}
          reviewsReady={!reviewsQ.isPending}
        />
      )}

      <EmergencyLine er={course.er} prefix="응급 시: 응급실" />
      <LegalLinks locationOn={locationOn} />
    </div>
  );
}
