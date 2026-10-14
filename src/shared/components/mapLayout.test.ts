import { describe, expect, it } from "vitest";
import { layoutMarkers } from "./mapLayout";

describe("지도 마커 배치", () => {
  it("같은 자리의 두 마커는 서로 비켜 번호가 가려지지 않는다", () => {
    const [a, b] = layoutMarkers([
      { x: 100, y: 100, r: 16, chars: 4 },
      { x: 102, y: 101, r: 16, chars: 4 },
    ]);
    const ax = 100 + (a?.dx ?? 0);
    const ay = 100 + (a?.dy ?? 0);
    const bx = 102 + (b?.dx ?? 0);
    const by = 101 + (b?.dy ?? 0);
    expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThanOrEqual(32);
  });

  it("아래 자리에 다른 마커가 있으면 이름표는 위로 간다", () => {
    const [top] = layoutMarkers([
      { x: 100, y: 100, r: 16, chars: 3 },
      { x: 100, y: 140, r: 16, chars: 3 },
    ]);
    expect(top?.ly).toBeLessThan(0);
  });

  it("칸 밖으로 나가는 자리는 고르지 않는다", () => {
    // 아래 · 위가 다른 마커로 막히고 왼쪽 끝에 붙은 마커 → 오른쪽
    const [edge] = layoutMarkers(
      [
        { x: 20, y: 100, r: 16, chars: 6 },
        { x: 20, y: 140, r: 16, chars: 1 },
        { x: 20, y: 60, r: 16, chars: 1 },
      ],
      { w: 300, h: 300 },
    );
    expect(edge?.lx).toBeGreaterThan(0);
  });

  it("떨어진 마커의 이름표는 아래에 둔다", () => {
    const spots = layoutMarkers([
      { x: 0, y: 0, r: 16, chars: 3 },
      { x: 300, y: 300, r: 16, chars: 3 },
    ]);
    expect(spots.every((s) => s.ly > 0 && s.lx === 0 && s.dx === 0 && s.dy === 0)).toBe(true);
  });
});
