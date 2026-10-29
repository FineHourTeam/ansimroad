// S5 자녀 현황: 예정 vs 실제(사진)를 나란히 보고 '지금 어디쯤인지' 3초 안에 안다.
// F-21 타임라인 · F-22 현황 카드(실시간) · F-24 위치 설정(기본 OFF) · D-08 위치 제공 기록
// 순서: 코스 이름 → 현황 카드 → 링크 카드(늘) → 추억 페이지 칸([예시] · [여행 완료]) → 일정 한눈에 보기 → 지도 → 출발 시각 → 일정 · 사진
// 코스 수정 화면 없이 여기서 바로 고친다 (2026-10-29): 날짜 · 출발 시각 · 이름 · 장소 카드 ⋮(다음에 경로 추가 · 메모 · 삭제하기) · 머무는 시간
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  usePhotos,
  useRecordLocationEvent,
  useReviews,
  useSaveMemo,
  useUpdateCourse,
  useUpdateTripDate,
} from "@/features/trip";
import { EmergencyLine, LegalLinks, Loading } from "@/shared/components/common";
import { MapView } from "@/shared/components/MapView";
import type { Course, Settings, TripAccess, TripSnapshot } from "@/shared/domain/types";
import { isClosedOn } from "@/shared/engine/rules";
import { nowLinePosition, photosBySlot } from "@/shared/engine/timeline";
import {
  changeStay,
  insertPlaceAt,
  MAX_STOPS,
  MAX_STOPS_MESSAGE,
  removeStop,
} from "@/shared/lib/courseEdit";
import { courseTone } from "@/shared/lib/courseTheme";
import { hhmm, koreanMonthDay, minutesOfDay, toLocalYmd } from "@/shared/lib/date";
import { courseMapPoints } from "@/shared/lib/mapPoints";
import { useNow } from "../hooks/useNow";
import { usePhotoUpload } from "../hooks/usePhotoUpload";
import { bannerText, isPast } from "../lib/familyView";
import { CompleteTrip } from "./CompleteTrip";
import { CourseHeader, StartAdjust } from "./CourseControls";
import { PhotoPicker } from "./PhotoPicker";
import {
  FamilyLinks,
  LinksCard,
  MemoriesCard,
  MemoriesExampleButton,
  ReportCard,
} from "./SendCard";
import { StatusBanner, type TripPhase } from "./StatusBanner";
import { AddPlaceDialog } from "./StopActions";
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
  const updateDate = useUpdateTripDate(tripId);
  const saveMemo = useSaveMemo(tripId);
  const [addAfter, setAddAfter] = useState<number | null>(null);
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

  const changeDate = (next: string) => {
    const closed = course.stops.filter((s) => isClosedOn(s.place, next)).map((s) => s.place.name);
    updateDate.mutate(next, {
      onSuccess: () => {
        const done = `여행 날짜를 ${koreanMonthDay(next)}로 바꿨어요`;
        if (closed.length > 0) {
          toast.warning(done, { description: `그날 쉬는 곳이 있어요: ${closed.join(", ")}` });
        } else toast.success(done);
      },
      onError: () => {
        toast.error("날짜를 저장하지 못했어요. 다시 골라 주세요");
      },
    });
  };

  const removeAt = (i: number) => {
    const name = course.stops[i]?.place.name ?? "";
    if (course.stops.length <= 1) {
      toast.error("장소가 하나뿐이라 뺄 수 없어요");
      return;
    }
    apply(removeStop(course, i));
    toast(`${name} 일정을 뺐어요`, {
      action: {
        label: "되돌리기",
        onClick: () => {
          apply(course);
        },
      },
    });
  };

  const ended = !!trip.completedAt || today > date || (today === date && nowMin >= course.endMin);
  const phase: TripPhase = ended ? "done" : today < date ? "before" : "today";
  // 사진이 없어도 여행 날부터 마칠 수 있다 (사진이 먼저 올라왔으면 그때부터)
  const canComplete = today >= date || photos.length > 0;

  return (
    // data-course: 번호 원 · 지도 마커 · 경로 선이 코스 테마 색
    <div className="flex flex-col gap-4" data-course={courseTone(course.theme)}>
      {trip.reportToken && <ReportCard reportToken={trip.reportToken} />}
      {trip.completedAt && <MemoriesCard token={token} />}
      <CourseHeader
        date={date}
        today={today}
        expiresOn={trip.expiresOn}
        course={course}
        onChange={apply}
        onDate={trip.completedAt ? undefined : changeDate}
      />

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

      <LinksCard trip={trip} seniorToken={access.seniorToken} familyToken={token} />
      {/* 여행을 마치면 맨 위 추억 페이지 카드로 바뀐다 */}
      {!trip.completedAt && (
        <CompleteTrip
          trip={trip}
          reviews={reviewsQ.data ?? {}}
          reviewsReady={!reviewsQ.isPending}
          canComplete={canComplete}
          example={<MemoriesExampleButton />}
        />
      )}
      <FamilyLinks token={token} printOn={settings.printViewEnabled} />

      {/* isolate: 지도 안 네이버 로고 · 확대 단추의 z-index 가 위 고정 막대를 넘지 않게 */}
      <MapView points={points} className="border-border/80 isolate rounded-2xl shadow-sm" />
      <StartAdjust course={course} onChange={apply} />

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
        onAddNext={(i) => {
          if (course.stops.length >= MAX_STOPS) toast.error(MAX_STOPS_MESSAGE);
          else setAddAfter(i);
        }}
        onRemove={removeAt}
        onMemo={async (placeId, text) => {
          try {
            await saveMemo.mutateAsync({ placeId, text });
          } catch (err) {
            toast.error("메모를 저장하지 못했어요. 다시 눌러 주세요");
            throw err;
          }
        }}
      />
      <AddPlaceDialog
        course={course}
        after={addAfter}
        date={date}
        onOpenChange={(open) => {
          if (!open) setAddAfter(null);
        }}
        onPick={(place) => {
          if (addAfter === null) return;
          apply(insertPlaceAt(course, addAfter + 1, place));
          setAddAfter(null);
          toast.success(`${place.name} 일정을 넣었어요`);
        }}
      />
      <PhotoPicker
        open={picker.open}
        placeName={course.stops[picker.index]?.place.name ?? ""}
        onOpenChange={(open) => {
          setPicker((p) => ({ ...p, open }));
        }}
        onFiles={(files) =>
          void uploadFiles(files, picker.index, course.stops[picker.index]?.place.id)
        }
      />
      <p className="text-muted-foreground text-center text-sm">
        사진과 링크를 볼 수 있는 마지막 날 · {koreanMonthDay(trip.expiresOn)}
      </p>

      <EmergencyLine er={course.er} prefix="가까운 응급실" />
      <LegalLinks locationOn={locationOn} className="mt-6" />
    </div>
  );
}
