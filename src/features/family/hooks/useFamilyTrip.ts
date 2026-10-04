// 자녀 링크(/f/{token}) 화면 공통: 토큰 확인 → 여행(실시간) · 설정값을 한 상태로 묶는다.
import { useSettings } from "@/features/places";
import { useTrip, useTripAccess } from "@/features/trip";
import type { Settings, TripAccess, TripSnapshot } from "@/shared/domain/types";

export type FamilyTripState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "denied"; reason: "not_found" | "wrong_role" | "expired"; expiryDays: number }
  | { status: "ready"; trip: TripSnapshot; access: TripAccess; settings: Settings };

export function useFamilyTrip(token: string): FamilyTripState {
  const access = useTripAccess(token, "family");
  const tripId = access.data?.ok ? access.data.access.tripId : null;
  const trip = useTrip(tripId);
  const settings = useSettings();

  if (access.isPending || settings.isPending) return { status: "loading" };
  if (access.isError || settings.isError) {
    return {
      status: "error",
      retry: () => {
        void access.refetch();
        void settings.refetch();
      },
    };
  }
  const expiryDays = settings.data.tripExpiryDays;
  if (!access.data.ok) return { status: "denied", reason: access.data.reason, expiryDays };
  if (trip.isPending) return { status: "loading" };
  if (trip.isError) {
    return {
      status: "error",
      retry: () => {
        void trip.refetch();
      },
    };
  }
  if (!trip.data) return { status: "denied", reason: "not_found", expiryDays };
  return { status: "ready", trip: trip.data, access: access.data.access, settings: settings.data };
}
