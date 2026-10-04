import { afterEach, describe, expect, it, vi } from "vitest";
import { validateRecord, emptyRecord } from "@/shared/data/placeRecords";
import { searchTour, tourToRecord } from "./tourapi";

const ok = (item: unknown) => ({
  response: { header: { resultCode: "0000" }, body: { items: item ? { item } : "" } },
});

function stub(map: Record<string, unknown>) {
  vi.stubGlobal("fetch", (url: string) => {
    const key = Object.keys(map).find((k) => url.includes(k));
    const body = key ? map[key] : ok(null);
    return Promise.resolve({
      status: 200,
      text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
    });
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("한국관광공사 TourAPI 가져오기", () => {
  it("검색은 목포 주소만, 숙박 · 축제는 뺀다", async () => {
    stub({
      searchKeyword2: ok([
        { contentid: "1", contenttypeid: "12", title: "갓바위", addr1: "전라남도 목포시 남농로" },
        { contentid: "2", contenttypeid: "12", title: "갓바위(다른 곳)", addr1: "경상북도 경산시" },
        { contentid: "3", contenttypeid: "32", title: "갓바위 호텔", addr1: "전라남도 목포시" },
      ]),
    });
    const r = await searchTour("갓바위");
    expect(r.map((i) => i.contentid)).toEqual(["1"]);
  });

  it("상세를 조사표 칸으로: 좌표 · 사진 여러 장 · 비고(이용시간 · 무장애), 접근성 칸은 비워 둔다", async () => {
    stub({
      detailCommon2: ok([{ overview: "바위<br>설명" }]),
      detailIntro2: ok([{ usetime: "상시", restdate: "연중무휴" }]),
      detailImage2: ok([{ originimgurl: "http://tong.visitkorea.or.kr/b.jpg" }]),
      detailWithTour2: ok([{ wheelchair: "휠체어 대여 가능", restroom: "장애인 화장실 있음" }]),
    });
    const f = await tourToRecord({
      contentid: "1",
      contenttypeid: "12",
      title: "갓바위",
      addr1: "전라남도 목포시",
      mapx: "126.42",
      mapy: "34.79",
      firstimage: "http://tong.visitkorea.or.kr/a.jpg",
    });
    expect(f.위도).toBe("34.79");
    expect(f.사진URL).toBe(
      "https://tong.visitkorea.or.kr/a.jpg | https://tong.visitkorea.or.kr/b.jpg",
    );
    expect(f.비고).toContain("[관광공사 무장애] 휠체어: 휠체어 대여 가능");
    expect(f.비고).toContain("contentid=1");
    expect(f.휠체어접근).toBeUndefined();
    // 권역만 채우면 시트 규칙을 통과한다
    expect(validateRecord({ ...emptyRecord(), ...f, ID: "N0001", 권역: "갓바위권" })).toBeNull();
  });

  it("서비스 키 오류(XML)는 알아볼 수 있는 문구로", async () => {
    stub({
      searchKeyword2:
        "<OpenAPI_ServiceResponse><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg></OpenAPI_ServiceResponse>",
    });
    await expect(searchTour("갓바위")).rejects.toThrow("TourAPI 서비스 키");
    stub({
      searchKeyword2: {
        OpenAPI_ServiceResponse: { cmmMsgHeader: { errMsg: "SERVICE_KEY_IS_NULL" } },
      },
    });
    await expect(searchTour("갓바위")).rejects.toThrow("TourAPI 서비스 키");
  });
});
