// 그림 지도: 네이버 정적 지도(바탕) + 우리가 겹쳐 그린 경로선 · 번호 · 이름표 (인쇄 · 이미지 저장용, 모담 대표 요청 2026-10-29).
// 움직이는 네이버 지도는 타일이 다른 출처라 이미지로 담기지 않지만, 정적 지도(raster-cors)는 CORS 를 열어 주어 그대로 담긴다.
// 칸 폭에 맞춰 그림을 요청하고(최대 1024px · scale 2), 그림을 못 받으면 onError 로 약도로 바꾼다.
import { useLayoutEffect, useRef, useState } from "react";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { staticMapUrl, staticView } from "@/shared/lib/staticMap";
import { layoutMarkers } from "./mapLayout";
import { MARKER_CLASS, markerName, type MapPoint } from "./mapMarker";

const RATIO = 13 / 20; // 움직이는 지도 칸과 같은 비율 (aspect-[20/13])
const radius = (p: MapPoint) => (p.kind === "cand" ? 12 : 16);
const labelOf = (p: MapPoint) => (p.kind === "er" ? "응급실" : p.name);

export function StaticRouteMap({
  points,
  onError,
  className,
}: {
  points: MapPoint[];
  onError: () => void;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      setW(Math.min(1024, Math.round(el.clientWidth)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  const h = Math.round(w * RATIO);
  const view = w > 0 ? staticView(points, w, h) : null;
  const px = view
    ? points.map((p) => ({ ...view.toPx(p), r: radius(p), chars: labelOf(p).length }))
    : [];
  const spots = view ? layoutMarkers(px, { w, h }) : [];
  const route = px
    .filter((_, i) => points[i]?.kind === "stop")
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <div ref={box} className={cn("relative aspect-[20/13] w-full overflow-hidden", className)}>
      {view && (
        <>
          <img
            src={staticMapUrl(env.VITE_NAVER_MAP_CLIENT_ID, view, w, h)}
            crossOrigin="anonymous"
            alt=""
            className="absolute inset-0 size-full"
            onError={onError}
          />
          <svg
            aria-hidden="true"
            className="text-course absolute inset-0 size-full"
            viewBox={`0 0 ${String(w)} ${String(h)}`}
          >
            <polyline
              points={route}
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              strokeOpacity={0.8}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <ul aria-label="지도에 표시한 곳" className="absolute inset-0">
            {points.map((p, i) => {
              const at = px[i];
              const spot = spots[i];
              if (!at || !spot) return null;
              const r = at.r;
              return (
                <li
                  key={`${p.kind}-${p.label}-${String(i)}`}
                  className="absolute"
                  style={{ left: at.x - r + spot.dx, top: at.y - r + spot.dy }}
                >
                  <span
                    className={cn(
                      MARKER_CLASS[p.kind],
                      "border-background grid place-items-center rounded-full border-2 font-bold shadow-md",
                    )}
                    aria-label={markerName(p)}
                  >
                    {p.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="bg-background/90 text-foreground absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded px-1.5 text-xs font-semibold whitespace-nowrap shadow-sm"
                    style={{ left: r + spot.lx, top: r + spot.ly }}
                  >
                    {labelOf(p)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
