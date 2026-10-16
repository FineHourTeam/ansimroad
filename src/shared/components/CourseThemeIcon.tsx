// 코스 테마 아이콘: 바다 = 물결 · 역사·문화 = 기와지붕 · 자연·경치 = 산. 테마가 없는 코스(대표 · 추천)는 지도 핀
import {
  HistoryThemeIcon,
  MapPinIcon,
  NatureThemeIcon,
  SeaThemeIcon,
  type IconProps,
} from "@/components/icons";
import type { Theme } from "@/shared/domain/types";
import { courseTone } from "@/shared/lib/courseTheme";

const ICON = { sea: SeaThemeIcon, history: HistoryThemeIcon, nature: NatureThemeIcon };

export function CourseThemeIcon({ theme, ...rest }: { theme: Theme | null } & IconProps) {
  const tone = courseTone(theme);
  const Icon = tone ? ICON[tone] : MapPinIcon;
  return <Icon {...rest} />;
}
