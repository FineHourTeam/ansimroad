// S2 · S2-1: 주소(입력값 + 제외 목록)만으로 코스를 다시 만든다 → 같은 주소면 같은 결과 (F-12)
import { useMemo } from "react";
import { useCourseTexts, usePublishedCurated } from "@/features/curated";
import { usePlaceData, useSettings } from "@/features/places";
import { generateCourses } from "@/shared/engine/generate";
import { curatedFits, curatedToCourse } from "@/shared/lib/curated";
import { decodeQuery } from "@/shared/lib/tripInput";

export function useCourseResult(search: string) {
  const { input, excluded } = useMemo(() => decodeQuery(search), [search]);
  const placesQ = usePlaceData();
  const settingsQ = useSettings();
  const curatedQ = usePublishedCurated();
  const textsQ = useCourseTexts(); // 자동 코스별 설명 (못 읽으면 설명 없이 보여 준다)
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

  // 운영진 추천 코스: 장소가 하나도 없는 코스, 이동조건 · 여행 날짜 휴무에 맞지 않는 코스는 뺀다
  const curated = useMemo(() => {
    if (!places || !curatedQ.data || !input) return [];
    return curatedQ.data
      .filter((c) => c.published && c.stops.length > 0)
      .map((c) => curatedToCourse(c, places, input.start, settings?.emergencyByRegion))
      .filter((course) => curatedFits(course, input));
  }, [curatedQ.data, places, input, settings?.emergencyByRegion]);

  return {
    input,
    excluded,
    result,
    curated,
    settings,
    placesQ,
    settingsQ,
    curatedQ,
    texts: textsQ.data,
  };
}
