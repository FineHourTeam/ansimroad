// S2 · S2-1: 주소(입력값 + 제외 목록)만으로 코스를 다시 만든다 → 같은 주소면 같은 결과 (F-12)
import { useMemo } from "react";
import { usePublishedCurated } from "@/features/curated";
import { usePlaceData, useSettings } from "@/features/places";
import { generateCourses } from "@/shared/engine/generate";
import { curatedToCourse } from "@/shared/lib/curated";
import { decodeQuery } from "@/shared/lib/tripInput";

export function useCourseResult(search: string) {
  const { input, excluded } = useMemo(() => decodeQuery(search), [search]);
  const placesQ = usePlaceData();
  const settingsQ = useSettings();
  const curatedQ = usePublishedCurated();
  const places = placesQ.data?.places;
  const settings = settingsQ.data;

  const result = useMemo(() => {
    if (!input || !places || !settings) return null;
    return generateCourses(places, input, settings, {
      excluded,
      representative: settings.representativeCourseEnabled,
      allowP3Swap: settings.rules.allowP3Swap,
      fallbackOnInfeasible: settings.rules.fallbackOnInfeasible,
    });
  }, [input, excluded, places, settings]);

  // 운영진 추천 코스: 장소가 하나도 없는 코스는 뺀다
  const curated = useMemo(() => {
    if (!places || !curatedQ.data) return [];
    return curatedQ.data
      .filter((c) => c.published && c.stops.length > 0)
      .map((c) => curatedToCourse(c, places));
  }, [curatedQ.data, places]);

  return { input, excluded, result, curated, settings, placesQ, settingsQ, curatedQ };
}
