// S5 자녀 현황: 예정 vs 실제(사진)를 나란히 보고 '지금 어디쯤인지' 3초 안에 안다.
// F-21 타임라인 · F-22 현황 카드(실시간) · F-24 위치 설정(기본 OFF) · D-08 위치 제공 기록
// 순서: 코스 이름 → 현황 카드 → (여행 전) 보내기 카드 → 바로가기 한 줄 → 지도 → 출발 시각 → 일정 · 사진 → 여행 완료
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePhotos, useRecordLocationEvent, useReviews, useUpdateCourse } from "@/features/trip";
import { EmergencyLine, LegalLinks, Loading } from "@/shared/components/common";
import { MapView } from "@/shared/components/MapView";
import type { Course, Settings, TripAccess, TripSnapshot } from "@/shared/domain/types";
import { nowLinePosition, photosBySlot } from "@/shared/engine/timeline";
import { changeStay } from "@/shared/lib/courseEdit";
import { courseTone } from "@/shared/lib/courseTheme";
import { hhmm, koreanMonthDay, minutesOfDay, toLocalYmd } from "@/shared/lib/date";
import { courseMapPoints } from "@/shared/lib/mapPoints";
import { useNow } from "../hooks/useNow";
import { usePhotoUpload } from "../hooks/usePhotoUpload";
import { bannerText, isPast } from "../lib/familyView";
import { CompleteTrip } from "./CompleteTrip";
import { CourseHeader, StartAdjust } from "./CourseControls";
import { PhotoPicker } from "./PhotoPicker";
import { FamilyLinks, MemoriesCard, ReportCard, SendCard } from "./SendCard";
import { StatusBanner, type TripPhase } from "./StatusBanner";
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

  const ended = !!trip.completedAt || today > date || (today === date && nowMin >= course.endMin);
  const phase: TripPhase = ended ? "done" : today < date ? "before" : "today";
  const showComplete = !trip.completedAt && (today >= date || photos.length > 0);
  // 보내기 카드는 여행 전에만 크게. 다만 여행 당일에 확정했으면 아직 링크를 안 보냈을 수 있어서 부모님 사진이 오기 전까지 둔다
  const confirmedToday = toLocalYmd(new Date(trip.createdAt)) === date;
  // 사진을 다 불러온 뒤에 판단한다 (불러오는 동안 카드가 잠깐 떴다 사라지지 않게)
  const showSend =
    today < date ||
    (phase === "today" &&
      confirmedToday &&
      photosQ.isSuccess &&
      !photos.some((p) => p.by === "senior"));

  return (
    // data-course: 번호 원 · 지도 마커 · 경로 선이 코스 테마 색
    <div className="flex flex-col gap-4" data-course={courseTone(course.theme)}>
      {trip.reportToken && <ReportCard reportToken={trip.reportToken} />}
      {trip.completedAt && <MemoriesCard token={token} />}
      <CourseHeader date={date} course={course} onChange={apply} />

      {photosQ.isPending ? (
        <Loading text="사진을 확인하는 중이에요" />
      ) : photosQ.isError ? (
        <div
          role="alert"
          className="bg-card flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 text-center"
        >
          <p className="font-bold">사진을 불러오지 못했어요</p>
          <Button variant="outline" size="xl" onClick={() => void photosQ.refetch()}>
            다시 불러오기
          </Button>
        </div>
      ) : (
        <StatusBanner
          phase={phase}
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

      {!trip.reportToken && showSend && access.seniorToken && (
        <SendCard trip={trip} seniorToken={access.seniorToken} familyToken={token} />
      )}
      <FamilyLinks token={token} printOn={settings.printViewEnabled} />

      {/* isolate: 지도 안 네이버 로고 · 확대 단추의 z-index 가 위 고정 막대를 넘지 않게 */}
      <MapView points={points} className="border-border/80 isolate rounded-2xl shadow-sm" />
      <StartAdjust course={course} onChange={apply} />

      {photosQ.isSuccess && (
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight">사진 {photos.length}장</h2>
          <p className="text-muted-foreground text-sm">새 사진은 바로 보여요</p>
        </div>
      )}
      {photosQ.isSuccess && photos.length === 0 && (
        <p className="bg-card text-muted-foreground rounded-xl border border-dashed px-4 py-3 text-center text-sm">
          아직 올라온 사진이 없어요. 장소 칸을 눌러 사진을 올려 보세요.
        </p>
      )}
      <Timeline
        course={course}
        transport={trip.input.transport}
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

      <EmergencyLine er={course.er} prefix="가까운 응급실" />
      <LegalLinks locationOn={locationOn} className="mt-6" />
    </div>
  );
}
