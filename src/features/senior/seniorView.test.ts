import { describe, expect, it } from "vitest";
import {
  canShootOn,
  countSentToday,
  dayGapOf,
  dayNotice,
  erDisplayName,
  keepDaysOf,
  locate,
  withTimeout,
} from "./seniorView";
import type { PhotoRecord, TripInput } from "@/shared/domain/types";

const photo = (by: PhotoRecord["by"], takenAt: string): PhotoRecord => ({
  id: takenAt + by,
  tripId: "t",
  takenAt,
  url: "",
  width: 1,
  height: 1,
  lat: null,
  lng: null,
  locationStatus: "off",
  by,
});

describe("여행일 계산", () => {
  it("당일 0, 전날 -1, 다음날 1", () => {
    expect(dayGapOf(new Date(2026, 9, 18, 12, 20), "2026-10-18")).toBe(0);
    expect(dayGapOf(new Date(2026, 9, 17, 23, 59), "2026-10-18")).toBe(-1);
    expect(dayGapOf(new Date(2026, 9, 19, 0, 1), "2026-10-18")).toBe(1);
  });

  it("사진은 여행일 ±1일만", () => {
    expect([-2, -1, 0, 1, 2].map(canShootOn)).toEqual([false, true, true, true, false]);
  });

  it("당일이 아니면 안내 한 줄", () => {
    expect(dayNotice(0)).toBeNull();
    expect(dayNotice(-1)).toBe("내일이 여행 날이에요");
    expect(dayNotice(-3)).toBe("여행까지 3일 남았어요");
    expect(dayNotice(1)).toBe("어제가 여행 날이었어요");
    expect(dayNotice(2)).toBe("지난 여행이에요");
  });
});

describe("오늘 보낸 사진 수", () => {
  it("어르신이 오늘 찍은 사진만 센다", () => {
    const list = [
      photo("senior", new Date(2026, 9, 18, 10, 0).toISOString()),
      photo("senior", new Date(2026, 9, 18, 13, 0).toISOString()),
      photo("family", new Date(2026, 9, 18, 13, 5).toISOString()),
      photo("senior", new Date(2026, 9, 17, 9, 0).toISOString()),
      photo("senior", ""),
    ];
    expect(countSentToday(list, "2026-10-18")).toBe(2);
    expect(countSentToday([], "2026-10-18")).toBe(0);
  });
});

describe("보유 기간", () => {
  const input: TripInput = {
    party: 2,
    age: 70,
    mobility: "none",
    walk: 20,
    date: "2026-10-18",
    transport: "car",
  };
  it("만료일 - 여행일, 못 읽으면 설정값", () => {
    expect(keepDaysOf({ input, expiresOn: "2026-11-17" }, 30)).toBe(30);
    expect(keepDaysOf({ input, expiresOn: "2026-10-25" }, 30)).toBe(7);
    expect(keepDaysOf({ input, expiresOn: "" }, 30)).toBe(30);
  });
});

describe("사진 위치", () => {
  it("설정 OFF면 off, '위치 없이 시작'이면 skipped (위치 권한을 묻지 않는다)", async () => {
    expect(await locate(false, "agree")).toEqual({ lat: null, lng: null, locationStatus: "off" });
    expect(await locate(true, "no_location")).toEqual({
      lat: null,
      lng: null,
      locationStatus: "skipped",
    });
  });
});

describe("보내기 시간 제한", () => {
  it("제때 끝나면 결과, 안 끝나면 timeout 으로 실패", async () => {
    await expect(withTimeout(Promise.resolve(1), 1000)).resolves.toBe(1);
    await expect(withTimeout(new Promise<never>(() => undefined), 10)).rejects.toThrow("timeout");
    await expect(withTimeout(Promise.reject(new Error("x")), 1000)).rejects.toThrow("x");
  });
});

describe("응급실 이름", () => {
  it("법인 앞머리를 떼고, 다 떼어지거나 앞머리가 없으면 그대로", () => {
    expect(erDisplayName("의료법인해민의료재단세안종합병원")).toBe("세안종합병원");
    expect(erDisplayName("학교법인 가톨릭학원 목포성모병원")).toBe("목포성모병원");
    expect(erDisplayName("목포한국병원")).toBe("목포한국병원");
    expect(erDisplayName("의료법인 목포병원")).toBe("의료법인 목포병원");
    expect(erDisplayName("재단법인아산재단")).toBe("재단법인아산재단");
  });
});
