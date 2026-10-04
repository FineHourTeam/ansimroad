// 약도: 이름표가 다른 마커를 가리지 않는지 · 응급실 마커 · 누름 안내(hint)
import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { MapView, type MapPoint } from "./MapView";

vi.mock("@/lib/env", () => ({ env: { VITE_NAVER_MAP_CLIENT_ID: "" } })); // 약도로 그린다

const pt = (name: string, lat: number, lng: number, extra: Partial<MapPoint> = {}): MapPoint => ({
  name,
  lat,
  lng,
  label: "1",
  kind: "stop",
  ...extra,
});
const top = (el: Element | null) => parseFloat((el as HTMLElement | null)?.style.top ?? "NaN");

describe("약도", () => {
  test("이름표 자리에 다른 마커가 있으면 아래로 비킨다", () => {
    // 나중에 '위쪽'이 바로 위(약도 26칸)에 있어 '아래쪽' 이름표의 위 자리를 막는다
    const { container, getByText } = render(
      <MapView
        points={[
          pt("아래쪽", 34.8, 126.38),
          pt("위쪽", 34.817, 126.38, { label: "2" }),
          pt("먼곳", 34.7, 126.48, { label: "3" }),
        ]}
      />,
    );
    const marker = container.querySelector('[aria-label="아래쪽"]');
    expect(top(getByText("아래쪽"))).toBeGreaterThan(top(marker));
  });

  test("응급실은 병원 아이콘, 누름 안내는 읽는 이름에만 붙는다", () => {
    const { container, getByText } = render(
      <MapView
        points={[
          pt("가게", 34.8, 126.38),
          pt("응급실 · 병원", 34.75, 126.43, { label: "✚", kind: "er" }),
          pt("독천식당", 34.7, 126.48, { label: "+", kind: "cand", hint: " (눌러서 추가)" }),
        ]}
        onSelect={() => undefined}
      />,
    );
    const er = container.querySelector('[aria-label="응급실 · 병원"]');
    expect(er?.querySelector("svg")).not.toBeNull();
    expect(er?.textContent).toBe("");
    expect(container.querySelector('[aria-label="독천식당 (눌러서 추가)"]')).not.toBeNull();
    expect(getByText("독천식당")).toBeInTheDocument();
  });

  test("한곳에 몰린 마커도 약도 안에서 서로 비켜 모두 누를 수 있다", () => {
    const crowd = Array.from({ length: 20 }, (_, i) =>
      pt(`몰린곳${String(i)}`, 34.8, 126.38, { kind: "cand", label: "" }),
    );
    const { container } = render(
      <MapView points={[...crowd, pt("먼곳", 34.7, 126.48)]} onSelect={() => undefined} />,
    );
    // 약도 좌표계(400 × 260)로 되돌려 잰다
    const at = crowd.map((p) => {
      const el = container.querySelector<HTMLElement>(`[aria-label="${p.name}"]`);
      return {
        x: parseFloat(el?.style.left ?? "NaN") * 4,
        y: parseFloat(el?.style.top ?? "NaN") * 2.6,
      };
    });
    for (const a of at) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThanOrEqual(400);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThanOrEqual(260);
    }
    const closest = Math.min(
      ...at.flatMap((a, i) => at.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))),
    );
    expect(closest).toBeGreaterThanOrEqual(22);
  });
});
