// 코스 지도 (F-09): 장소(순서 번호) + 응급실 마커.
// Client ID가 있으면 네이버 지도(JavaScript API v3), 없거나 인증에 실패하면 좌표로 그린 약도를 보여 준다.
import { useEffect, useMemo, useRef, useState } from "react";
import { layoutMarkers } from "./mapLayout";
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
  getProjection(): { fromCoordToOffset(c: NLatLng): { x: number; y: number } };
  getCenter(): NLatLng;
}
interface NaverMaps {
  LatLng: new (lat: number, lng: number) => NLatLng;
  Map: new (el: HTMLElement, opts: object) => NMap;
  Polyline: new (opts: object) => unknown;
  Marker: new (opts: object) => unknown;
  Point: new (x: number, y: number) => unknown;
  LatLngBounds: new (a: NLatLng, b: NLatLng) => { extend(p: NLatLng): void };
  Event: {
    addListener(target: unknown, name: string, cb: (e: { coord: NLatLng }) => void): unknown;
  };
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

function NaverMap({
  points,
  onError,
  onSelect,
  onMapClick,
  still,
}: MapProps & { onError: () => void; still: boolean }) {
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
          // still: 인쇄용 — 단추 없이 그림처럼 (끌기 · 확대 막음)
          zoomControl: !still,
          draggable: !still,
          scrollWheel: !still,
          pinchZoom: !still,
          disableDoubleClickZoom: still,
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
        // 이름표는 늘 띄우고(약도와 같게) 누르면 뜨는 말풍선은 두지 않는다.
        // 점 자리(anchor)는 그대로 두고, 겹친 점 · 이름표 위치는 relayout 이 style 로 옮긴다
        const radius = (p: MapPoint) => (p.kind === "cand" ? 12 : 16);
        const labelOf = (p: MapPoint) => (p.kind === "er" ? "응급실" : p.name);
        points.forEach((p, i) => {
          const r = radius(p);
          const marker = new maps.Marker({
            map: m,
            position: toLatLng(p),
            title: markerName(p),
            icon: {
              content: `<div data-mi="${String(i)}" class="relative"><div class="${MARKER_CLASS[p.kind]} grid place-items-center rounded-full border-2 border-background font-bold shadow-md" aria-label="${escapeHtml(markerName(p))}">${escapeHtml(p.label)}</div><span data-ml aria-hidden="true" class="bg-background/90 text-foreground pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded px-1.5 text-xs font-semibold whitespace-nowrap shadow-sm" style="left:${String(r)}px;top:${String(r * 2 + 12)}px">${escapeHtml(labelOf(p))}</span></div>`,
              anchor: new maps.Point(r, r),
            },
          });
          maps.Event.addListener(marker, "click", () => {
            selectRef.current?.(p);
          });
        });
        const relayout = () => {
          // 지도 칸 기준 픽셀 좌표 (칸 왼쪽 위 = 0,0): 칸 가운데 좌표와의 차이로 구한다
          const proj = m.getProjection();
          const mid = proj.fromCoordToOffset(m.getCenter());
          const w = el.clientWidth;
          const h = el.clientHeight;
          const px = points.map((p) => {
            const o = proj.fromCoordToOffset(toLatLng(p));
            return {
              x: o.x - mid.x + w / 2,
              y: o.y - mid.y + h / 2,
              r: radius(p),
              chars: labelOf(p).length,
            };
          });
          layoutMarkers(px, { w, h }).forEach((spot, i) => {
            const box = el.querySelector<HTMLElement>(`[data-mi="${String(i)}"]`);
            const label = box?.querySelector<HTMLElement>("[data-ml]");
            const r = px[i]?.r ?? 16;
            if (!box || !label) return;
            box.style.transform = `translate(${String(spot.dx)}px, ${String(spot.dy)}px)`;
            label.style.left = `${String(r + spot.lx)}px`;
            label.style.top = `${String(r + spot.ly)}px`;
          });
        };
        // 확대 · 이동이 끝날 때마다 다시 배치한다 (화면 픽셀 거리가 바뀐다)
        maps.Event.addListener(m, "idle", relayout);
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
          // 마커 DOM 이 붙은 다음 프레임에 배치한다 ('idle' 은 첫 맞춤 때 오지 않을 때가 있다)
          requestAnimationFrame(relayout);
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
  }, [points, onError, still]);
  return <div ref={ref} className="size-full" />;
}

export function MapView({
  points,
  className,
  onSelect,
  selectedId,
  onMapClick,
  still = false,
}: {
  points: MapPoint[];
  className?: string;
  /** 인쇄용: 확대 단추 없이 움직이지 않는 지도 */
  still?: boolean;
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
      className={cn("relative isolate overflow-hidden rounded-lg border", className)}
      data-testid="map-view"
    >
      {useNaver ? (
        <div className="aspect-[20/13] w-full">
          <NaverMap
            points={points}
            onError={onError}
            onSelect={onSelect}
            onMapClick={onMapClick}
            still={still}
          />
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
