// 네이버 지도 마커 배치: 화면 픽셀 좌표를 받아 (1) 거의 겹친 마커는 옆으로 비키고 (2) 이름표를 마커 · 다른 이름표와
// 겹치지 않고 지도 칸 안에 들어가는 자리(아래 → 위 → 오른쪽 → 왼쪽)에 둔다. 빈 자리가 없으면 아래에 둔다 (이름은 늘 보인다).
export interface MarkerPx {
  x: number;
  y: number;
  /** 마커 반지름 (px) */
  r: number;
  /** 이름표 글자 수 */
  chars: number;
}
export interface MarkerSpot {
  /** 마커를 비킨 만큼 */
  dx: number;
  dy: number;
  /** 이름표 가운데 (비킨 마커 가운데 기준) */
  lx: number;
  ly: number;
}

const GAP = 6; // 마커 사이 · 마커와 이름표 사이 여유
const LABEL_H = 18;
const labelW = (chars: number) => chars * 12 + 12; // text-xs 한글 한 글자 ≈ 12px + 좌우 여백

// 비킬 자리 후보: 가까운 순 (12px 격자, 반경 60px)
const NUDGES = Array.from({ length: 11 * 11 }, (_, i) => ({
  dx: ((i % 11) - 5) * 12,
  dy: (Math.floor(i / 11) - 5) * 12,
})).sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy));

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** frame: 지도 칸 크기 (px, 마커 좌표와 같은 기준). 주면 칸 밖으로 나가는 이름표 자리는 고르지 않는다 */
export function layoutMarkers(pts: MarkerPx[], frame?: { w: number; h: number }): MarkerSpot[] {
  const centers: { x: number; y: number; r: number }[] = [];
  for (const p of pts) {
    const free = NUDGES.find(({ dx, dy }) =>
      centers.every((c) => Math.hypot(c.x - (p.x + dx), c.y - (p.y + dy)) >= c.r + p.r + GAP),
    ) ?? { dx: 0, dy: 0 };
    centers.push({ x: p.x + free.dx, y: p.y + free.dy, r: p.r });
  }
  const boxes: Box[] = centers.map((c) => ({
    x0: c.x - c.r,
    x1: c.x + c.r,
    y0: c.y - c.r,
    y1: c.y + c.r,
  }));
  return pts.map((p, i) => {
    const c = centers[i] ?? { x: p.x, y: p.y, r: p.r };
    const w = labelW(p.chars);
    const below = { lx: 0, ly: c.r + GAP / 2 + LABEL_H / 2 };
    const options = [
      below,
      { lx: 0, ly: -below.ly },
      { lx: c.r + GAP + w / 2, ly: 0 },
      { lx: -(c.r + GAP + w / 2), ly: 0 },
    ];
    const boxOf = (o: { lx: number; ly: number }): Box => ({
      x0: c.x + o.lx - w / 2,
      x1: c.x + o.lx + w / 2,
      y0: c.y + o.ly - LABEL_H / 2,
      y1: c.y + o.ly + LABEL_H / 2,
    });
    const inside = (b: Box) =>
      !frame || (b.x0 >= 0 && b.y0 >= 0 && b.x1 <= frame.w && b.y1 <= frame.h);
    const pick =
      options.find((o) => inside(boxOf(o)) && !boxes.some((b) => hit(b, boxOf(o)))) ??
      options.find((o) => inside(boxOf(o))) ??
      below;
    boxes.push(boxOf(pick));
    return { dx: c.x - p.x, dy: c.y - p.y, ...pick };
  });
}
