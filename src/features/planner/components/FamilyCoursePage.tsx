// /f/:token/course — 확정한 코스 보기 · 수정 (S2-1 스냅샷). 자녀용 링크로만 열리고, 고친 내용은 바로 저장돼 어르신 화면에도 보인다.
import type { ReactNode } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { usePlaceData, useSettings } from "@/features/places";
import { useTrip, useTripAccess, useUpdateCourse } from "@/features/trip";
import { Loading, StateMessage } from "@/shared/components/common";
import type { Course, Place } from "@/shared/domain/types";
import { CourseDetail, DetailShell } from "./CourseDetail";

const NO_PLACES: Place[] = [];

function Retry({ onRetry }: { onRetry: () => void }) {
  return (
    <Button size="xl" onClick={onRetry}>
      다시 시도하기
    </Button>
  );
}

export function FamilyCoursePage() {
  const { token = "" } = useParams();
  const access = useTripAccess(token, "family");
  const tripId = access.data?.ok ? access.data.access.tripId : null;
  const trip = useTrip(tripId);
  const places = usePlaceData();
  const settings = useSettings();
  const update = useUpdateCourse(tripId ?? "", !!trip.data?.completedAt);
  const back = paths.family(token);

  const shell = (body: ReactNode) => (
    <DetailShell title="코스 상세" back={back}>
      <Seo title="코스 상세" noindex />
      {body}
    </DetailShell>
  );

  if (access.isPending) return shell(<Loading text="링크를 확인하고 있어요" />);
  if (access.isError) {
    return shell(
      <StateMessage title="링크를 확인하지 못했어요">
        <p className="text-muted-foreground">인터넷 연결을 확인하고 다시 시도해 주세요.</p>
        <Retry
          onRetry={() => {
            void access.refetch();
          }}
        />
      </StateMessage>,
    );
  }
  if (!access.data.ok) {
    return shell(
      access.data.reason === "expired" ? (
        <StateMessage title="기간이 지난 여행이에요">
          <p className="text-muted-foreground">
            링크는 여행일로부터 {settings.data?.tripExpiryDays ?? 30}일 동안만 열려요.
          </p>
        </StateMessage>
      ) : (
        // not_found · wrong_role(어르신용 토큰) 모두 같은 안내 — 토큰 종류를 드러내지 않는다
        <StateMessage title="링크를 다시 확인해 주세요">
          <p className="text-muted-foreground">이 화면은 확정 때 받은 ‘자녀용 링크’로만 열려요.</p>
        </StateMessage>
      ),
    );
  }
  if (trip.isPending) return shell(<Loading text="코스를 불러오고 있어요" />);
  if (trip.isError) {
    return shell(
      <StateMessage title="코스를 불러오지 못했어요">
        <p className="text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
        <Retry
          onRetry={() => {
            void trip.refetch();
          }}
        />
      </StateMessage>,
    );
  }
  if (!trip.data) {
    return shell(
      <StateMessage title="링크를 다시 확인해 주세요">
        <p className="text-muted-foreground">이 화면은 확정 때 받은 ‘자녀용 링크’로만 열려요.</p>
      </StateMessage>,
    );
  }

  const onChange = (next: Course) => {
    update.mutate(next, {
      onError: () => {
        toast.error("저장하지 못했어요. 다시 시도해 주세요");
      },
    });
  };
  return (
    <>
      <Seo title={`${trip.data.course.title} 상세`} noindex />
      <CourseDetail
        course={trip.data.course}
        input={trip.data.input}
        settings={settings.data ?? null}
        back={back}
        readOnly
        edit={{
          candidates: places.data?.places ?? NO_PLACES,
          onChange,
          candidatesStatus: {
            pending: places.isPending,
            onRetry:
              places.isError && !places.data
                ? () => {
                    void places.refetch();
                  }
                : undefined,
          },
        }}
      />
    </>
  );
}
