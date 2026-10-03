// 코스 확정 (S2 카드 · S2-1 하단 버튼): 스냅샷 + 링크 저장 → 통계 → 자녀 화면(S5)으로
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useSettings } from "@/features/places";
import { useCreateTrip } from "@/features/trip";
import { track } from "@/shared/lib/analytics";
import { sharedMemos } from "@/shared/lib/memo";
import type { Course, TripInput } from "@/shared/domain/types";

export function useConfirmCourse() {
  const navigate = useNavigate();
  const settings = useSettings().data;
  const create = useCreateTrip();
  const key = create.variables?.course.key ?? null;

  const confirm = (input: TripInput, course: Course) => {
    if (!settings || create.isPending) return;
    create.mutate(
      { input, course, expiryDays: settings.tripExpiryDays, memos: sharedMemos(course) },
      {
        onSuccess: (trip) => {
          track("course_confirm");
          void navigate(paths.family(trip.familyToken));
        },
        onError: () => {
          toast.error("확정하지 못했어요. 다시 눌러 주세요");
        },
      },
    );
  };

  return {
    confirm,
    ready: !!settings,
    busyKey: create.isPending ? key : null,
    failedKey: create.isError ? key : null,
    reset: create.reset,
  };
}
