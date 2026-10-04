// 약도: 네이버 지도 키가 없거나 인증에 실패했을 때 좌표를 투영해 HTML 요소로 그린다
import { useMemo, type MouseEvent } from "react";
import { MARKER_CLASS, markerName, type MapProps } from "./mapMarker";
import { HospitalIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

// 약도 좌표계 (가로:세로 = 20:13). 칸 비율이 같아서 각도·거리 비율이 그대로 유지된다.
const W = 400;
const H = 260;
const PAD = 40;
const GAP = 22; // 마커끼리 떨어질 거리
const EDGE = 12; // 비킨 마커도 이만큼은 약도 안쪽에 둔다
// 비킬 자리 후보 (24칸 격자): 가까운 순, 같은 거리면 옆 → 안쪽(+) 먼저
const NUDGES = Array.from({ length: 17 * 17 }, (_, i) => ({
  dx: ((i % 17) - 8) * 24,
  dy: (Math.floor(i / 17) - 8) * 24,
})).sort(
  (a, b) =>
    Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy) ||
    Math.abs(a.dy) - Math.abs(b.dy) ||
    b.dx - a.dx,
);

/** 키가 없거나 지도 로드에 실패했을 때: 좌표를 투영한 약도 (HTML 요소로 그린다) */
export function SketchMap({ points, onSelect, selectedId, onMapClick }: MapProps) {
  const { layout, proj } = useMemo(() => {
    const midLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const k = Math.cos((midLat * Math.PI) / 180);
    const xs = points.map((p) => p.lng * k);
    const ys = points.map((p) => -p.lat);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const scale = Math.min(
      (W - PAD * 2) / Math.max(maxX - minX, 1e-6),
      (H - PAD * 2) / Math.max(maxY - minY, 1e-6),
    );
    const offX = (W - (maxX - minX) * scale) / 2;
    const offY = (H - (maxY - minY) * scale) / 2;
    const placed: { x: number; y: number }[] = [];
    const laid = points.map((p, i) => {
      const x = offX + ((xs[i] ?? minX) - minX) * scale;
      const y = offY + ((ys[i] ?? minY) - minY) * scale;
      // 거의 같은 좌표의 마커는 가까운 빈자리(옆 · 안쪽 먼저)로 비켜 번호가 가려지지 않게 한다.
      // 약도 밖으로는 밀지 않는다 — 밖에 그려진 마커는 보이지도 눌리지도 않는다
      const inward = x > W / 2 ? -1 : 1;
      const spot = NUDGES.map(({ dx, dy }) => ({ x: x + dx * inward, y: y + dy })).find(
        (s) =>
          s.x >= EDGE &&
          s.x <= W - EDGE &&
          s.y >= EDGE &&
          s.y <= H - EDGE &&
          !placed.some((o) => Math.hypot(o.x - s.x, o.y - s.y) < GAP),
      ) ?? { x, y };
      placed.push(spot);
      return { ...p, ...spot };
    });
    return { layout: laid, proj: { k, minX, minY, scale, offX, offY } };
  }, [points]);

  // 이름표: 위 → 아래 순서로 자리를 찾고, 마커나 앞서 그린 이름표와 겹치면 생략한다 (번호는 항상 보인다)
  const labels = useMemo(() => {
    // 모든 마커 자리와 왼쪽 아래 '약도' 안내 자리를 먼저 막아 둔다 (마커 칸은 자기 이름표와 겹치지 않는 크기)
    const boxes = layout.map((p) => ({ x0: p.x - 14, x1: p.x + 14, y0: p.y - 14, y1: p.y + 14 }));
    boxes.push({ x0: 0, x1: 195, y0: H - 32, y1: H }); // 휴대폰 너비 기준 안내 글 크기
    return layout.map((p) => {
      const text =
        p.kind === "er" ? "응급실" : p.name.length > 9 ? `${p.name.slice(0, 8)}…` : p.name;
      const half = (text.length * 12.5) / 2 + 2;
      const cx = Math.min(W - half, Math.max(half, p.x));
      for (const dy of [-26, 24]) {
        const b = { x0: cx - half, x1: cx + half, y0: p.y + dy - 8, y1: p.y + dy + 8 };
        if (!boxes.some((o) => o.x0 < b.x1 && b.x0 < o.x1 && o.y0 < b.y1 && b.y0 < o.y1)) {
          boxes.push(b);
          return { text, x: cx, y: p.y + dy };
        }
      }
      return null;
    });
  }, [layout]);

  const stops = layout.filter((p) => p.kind === "stop");
  const segments = stops.slice(1).map((b, i) => {
    const a = stops[i] ?? b;
    return {
      a,
      len: Math.hypot(b.x - a.x, b.y - a.y),
      deg: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
    };
  });
  const pct = (v: number, of: number) => `${String((v / of) * 100)}%`;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!onMapClick || e.detail === 0) return; // 키보드로 누르면 좌표가 없다
    // 화면 좌표 → 약도 좌표 → 위도·경도 (투영을 거꾸로)
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    const { k, minX, minY, scale, offX, offY } = proj;
    onMapClick(-((y - offY) / scale + minY), ((x - offX) / scale + minX) / k);
  };

  return (
    <div
      role={onMapClick ? undefined : "img"}
      aria-label={onMapClick ? undefined : "코스 약도"}
      className="bg-background-subtle relative aspect-[20/13] w-full overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundSize: "6% 9.23%",
      }}
    >
      {onMapClick && (
        <button
          type="button"
          aria-label="약도에서 새 장소 위치 고르기"
          data-testid="sketch-map-canvas"
          className="absolute inset-0 cursor-crosshair"
          onClick={handleClick}
        />
      )}
      {segments.map(({ a, len, deg }, i) => (
        <span
          key={`seg-${String(i)}`}
          aria-hidden="true"
          className="bg-primary/75 pointer-events-none absolute h-1 origin-left rounded-full"
          style={{
            left: pct(a.x, W),
            top: pct(a.y, H),
            width: pct(len, W),
            transform: `translateY(-50%) rotate(${String(deg)}deg)`,
          }}
        />
      ))}
      {layout.map((p, i) => {
        const label = labels[i];
        const clickable = !!onSelect && p.kind !== "er";
        const Marker = clickable ? "button" : "span";
        return (
          <div key={`${p.kind}-${p.label}-${String(i)}`}>
            <Marker
              {...(clickable
                ? {
                    type: "button" as const,
                    onClick: () => {
                      onSelect(p);
                    },
                  }
                : {})}
              title={markerName(p)}
              aria-label={markerName(p)}
              className={cn(
                MARKER_CLASS[p.kind],
                "border-background absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 font-bold shadow-sm",
                p.id && p.id === selectedId && "ring-warning ring-4",
                clickable && "cursor-pointer",
              )}
              style={{ left: pct(p.x, W), top: pct(p.y, H) }}
            >
              {p.kind === "er" ? <HospitalIcon size="sm" /> : p.label}
            </Marker>
            {label && (
              <span
                aria-hidden="true"
                className={cn(
                  "bg-background/80 pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-sm px-1 text-xs font-bold whitespace-nowrap",
                  p.kind === "er" ? "text-emergency" : "text-primary",
                )}
                style={{ left: pct(label.x, W), top: pct(label.y, H) }}
              >
                {label.text}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
