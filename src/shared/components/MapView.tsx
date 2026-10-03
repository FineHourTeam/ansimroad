// 코스 지도 (F-09): 장소(순서 번호) + 응급실 마커.
// Client ID가 있으면 네이버 지도(JavaScript API v3), 없거나 인증에 실패하면 좌표로 그린 약도를 보여 준다.
import { useEffect, useMemo, useRef, useState } from "react";
import { MARKER_CLASS, markerName, type MapPoint, type MapProps } from "./mapMarker";
import { SketchMap } from "./SketchMap";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export type { MapPoint } from "./mapMarker";

// 네이버 지도 SDK 는 전역 naver.maps 로 들어온다. 쓰는 부분만 타입을 둔다.
interface NLatLng {
  lat(): number;
  lng(): number;
}
interface NMap {
  fitBounds(
    bounds: unknown,
    margin: { top: number; right: number; bottom: number; left: number },
  ): void;
  autoResize?: () => void;
  destroy?: () => void;
}
interface NaverMaps {
  LatLng: new (lat: number, lng: number) => NLatLng;
  Map: new (el: HTMLElement, opts: object) => NMap;
  Polyline: new (opts: object) => unknown;
  InfoWindow: new (opts: object) => {
    setContent(html: string): void;
    open(map: NMap, anchor: unknown): void;
  };
  Marker: new (opts: object) => unknown;
  Point: new (x: number, y: number) => unknown;
  LatLngBounds: new (a: NLatLng, b: NLatLng) => { extend(p: NLatLng): void };
  Event: { addListener(target: unknown, name: string, cb: (e: { coord: NLatLng }) => void): void };
  Position: { TOP_RIGHT: unknown };
  ZoomControlStyle: { SMALL: unknown };
}
declare global {
  interface Window {
    naver?: { maps: NaverMaps };
    navermap_authFailure?: () => void;
  }
}

let sdkPromise: Promise<NaverMaps> | null = null;
// 인증 실패는 지도를 만든 뒤에도 올 수 있어, 그려진 지도들에도 알려 약도로 바꾼다
let authFailed = false;
const authListeners = new Set<() => void>();
function loadNaverSdk(): Promise<NaverMaps> {
  if (authFailed) return Promise.reject(new Error("네이버 지도 인증 실패"));
  if (window.naver?.maps) return Promise.resolve(window.naver.maps);
  sdkPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?${env.VITE_NAVER_MAP_KEY_PARAM}=${encodeURIComponent(env.VITE_NAVER_MAP_CLIENT_ID)}`;
    s.async = true;
    s.onload = () => {
      if (window.naver?.maps) resolve(window.naver.maps);
      else reject(new Error("naver.maps 없음"));
    };
    s.onerror = () => {
      reject(new Error("네이버 지도 스크립트 로드 실패"));
    };
    window.navermap_authFailure = () => {
      authFailed = true;
      reject(new Error("네이버 지도 인증 실패 (Client ID·도메인 등록 확인)"));
      authListeners.forEach((cb) => {
        cb();
      });
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${String(c.charCodeAt(0))};`);

function NaverMap({ points, onError, onSelect, onMapClick }: MapProps & { onError: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const selectRef = useRef(onSelect);
  const mapClickRef = useRef(onMapClick);
  useEffect(() => {
    selectRef.current = onSelect;
    mapClickRef.current = onMapClick;
  });
  useEffect(() => {
    let disposed = false;
    let map: NMap | null = null;
    let ro: ResizeObserver | null = null;
    authListeners.add(onError);
    loadNaverSdk()
      .then((maps) => {
        const el = ref.current;
        const first = points[0];
        if (disposed || !el || !first) return;
        const toLatLng = (p: MapPoint) => new maps.LatLng(p.lat, p.lng);
        const primary = getComputedStyle(document.documentElement)
          .getPropertyValue("--primary")
          .trim();
        const m = new maps.Map(el, {
          center: toLatLng(first),
          zoom: 13,
          scaleControl: false,
          mapDataControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: maps.Position.TOP_RIGHT,
            style: maps.ZoomControlStyle.SMALL,
          },
        });
        map = m;
        new maps.Polyline({
          map: m,
          path: points.filter((p) => p.kind === "stop").map(toLatLng),
          strokeColor: primary,
          strokeWeight: 4,
          strokeOpacity: 0.8,
        });
        const info = new maps.InfoWindow({ borderWidth: 0, disableAnchor: false });
        for (const p of points) {
          const marker = new maps.Marker({
            map: m,
            position: toLatLng(p),
            title: markerName(p),
            icon: {
              content: `<div class="${MARKER_CLASS[p.kind]} grid place-items-center rounded-full border-2 border-background font-bold shadow-md" aria-label="${escapeHtml(markerName(p))}">${escapeHtml(p.label)}</div>`,
              anchor: new maps.Point(16, 16),
            },
          });
          maps.Event.addListener(marker, "click", () => {
            selectRef.current?.(p);
            info.setContent(
              `<div class="px-3 py-2 text-sm font-semibold">${escapeHtml(p.name)}</div>`,
            );
            info.open(m, marker);
          });
        }
        // 빈 곳을 누르면 그 좌표를 알려 준다 (관리자: 새 장소 찍기)
        maps.Event.addListener(m, "click", (e) =>
          mapClickRef.current?.(e.coord.lat(), e.coord.lng()),
        );
        const bounds = new maps.LatLngBounds(toLatLng(first), toLatLng(first));
        points.forEach((p) => {
          bounds.extend(toLatLng(p));
        });
        const fit = () => {
          m.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        };
        fit();
        // 칸 크기가 바뀌면(화면 회전·PC 배치) 마커가 밖으로 밀리지 않게 다시 맞춘다
        ro = new ResizeObserver(() => {
          m.autoResize?.();
          fit();
        });
        ro.observe(el);
      })
      .catch(() => {
        if (!disposed) onError();
      });
    return () => {
      disposed = true;
      authListeners.delete(onError);
      ro?.disconnect();
      try {
        map?.destroy?.();
      } catch {
        // 인증 실패 등으로 반쯤 만들어진 지도는 destroy 에서 오류를 낸다. 화면 전체가 깨지지 않게 무시
      }
    };
  }, [points, onError]);
  return <div ref={ref} className="size-full" />;
}

export function MapView({
  points,
  className,
  onSelect,
  selectedId,
  onMapClick,
}: {
  points: MapPoint[];
  className?: string;
  /** 관리자: 지도 빈 곳을 눌러 새 장소 좌표를 얻는다 */
  onMapClick?: (lat: number, lng: number) => void;
  /** 수정 모드: 마커를 눌러 장소를 고른다 */
  onSelect?: (p: MapPoint) => void;
  selectedId?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const onError = useMemo(
    () => () => {
      setFailed(true);
    },
    [],
  );
  if (points.length === 0) return null;
  const useNaver = !!env.VITE_NAVER_MAP_CLIENT_ID && !failed;
  return (
    <div
      className={cn("relative overflow-hidden rounded-lg border", className)}
      data-testid="map-view"
    >
      {useNaver ? (
        <div className="aspect-[20/13] w-full">
          <NaverMap points={points} onError={onError} onSelect={onSelect} onMapClick={onMapClick} />
        </div>
      ) : (
        <>
          <SketchMap
            points={points}
            onSelect={onSelect}
            selectedId={selectedId}
            onMapClick={onMapClick}
          />
          <span className="bg-background/90 text-muted-foreground absolute bottom-2 left-2 rounded-sm px-2 py-0.5 text-xs">
            약도 · 실제 거리와 다를 수 있어요
          </span>
        </>
      )}
    </div>
  );
}
