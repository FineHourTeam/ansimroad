// 한국관광공사 TourAPI (국문 관광정보 KorService2 + 무장애 여행정보 KorWithService2).
// 관리자 페이지에서 장소를 검색해 조사표 칸을 채운다. 서비스 키는 서버(Cloud Function tourapi, functions/src)가 붙이고,
// 운영진 로그인 토큰이 있어야 응답한다. 배포: Hosting rewrite /api/tourapi/** · 개발: vite 프록시 → Functions 에뮬레이터.
// 접근성 · 안전 칸은 자동으로 정하지 않는다: 관광공사 문구는 비고에 참고로 넣고, 운영진이 확인해서 고른다.
import { auth } from "@/lib/firebase";
import type { PlaceRecord } from "@/shared/data/placeRecords";

const COMMON = "MobileOS=WEB&MobileApp=AnsimRoad&_type=json";

export interface TourItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1?: string;
  addr2?: string;
  tel?: string;
  mapx?: string; // 경도
  mapy?: string; // 위도
  firstimage?: string;
  firstimage2?: string;
}

type Raw = Record<string, string>;

async function call(path: string, params: Record<string, string>): Promise<Raw[]> {
  const qs = new URLSearchParams(params).toString();
  const idToken = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/tourapi/${path}?${COMMON}&${qs}`, {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
  });
  if (res.status === 403) throw new Error("운영진으로 다시 로그인해 주세요");
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    // 키 오류는 JSON 이 아니라 XML 로 온다 (예: SERVICE_KEY_IS_NOT_REGISTERED_ERROR)
    const msg =
      /<returnAuthMsg>([^<]+)</.exec(text)?.[1] ??
      /<resultMsg>([^<]+)</.exec(text)?.[1] ??
      `HTTP ${String(res.status)}`;
    throw new Error(
      msg.includes("SERVICE_KEY")
        ? "TourAPI 서비스 키가 없거나 승인 전이에요 (함수 시크릿 TOURAPI_KEY)"
        : msg,
    );
  }
  // 키 오류가 JSON 으로 올 때도 있다: { OpenAPI_ServiceResponse: { cmmMsgHeader: { errMsg: 'SERVICE_KEY_IS_NULL' } } }
  const gw = (json as { OpenAPI_ServiceResponse?: { cmmMsgHeader?: { errMsg?: string } } })
    .OpenAPI_ServiceResponse;
  if (gw) {
    const msg = gw.cmmMsgHeader?.errMsg ?? "TourAPI 오류";
    throw new Error(
      msg.includes("SERVICE_KEY")
        ? "TourAPI 서비스 키가 없거나 승인 전이에요 (함수 시크릿 TOURAPI_KEY)"
        : msg,
    );
  }
  const body = (
    json as {
      response?: {
        header?: { resultCode?: string; resultMsg?: string };
        body?: { items?: { item?: Raw | Raw[] } | "" };
      };
    }
  ).response;
  if (body?.header?.resultCode && body.header.resultCode !== "0000")
    throw new Error(body.header.resultMsg ?? "TourAPI 오류");
  const items = body?.body?.items;
  if (!items || typeof items === "string" || !items.item) return [];
  return Array.isArray(items.item) ? items.item : [items.item];
}

/** 장소명 검색. 목포만 보려면 onlyMokpo (주소에 '목포'가 있는 것만) */
export async function searchTour(keyword: string, onlyMokpo = true): Promise<TourItem[]> {
  const items = (await call("KorService2/searchKeyword2", {
    keyword,
    numOfRows: "30",
    pageNo: "1",
    arrange: "O",
  })) as unknown as TourItem[];
  // 숙박(32) · 축제(15)는 코스 장소가 아니므로 뺀다
  return items.filter(
    (i) =>
      !["32", "15"].includes(i.contenttypeid) && (!onlyMokpo || (i.addr1 ?? "").includes("목포")),
  );
}

const TYPE: Record<string, string> = { "39": "식당" }; // 나머지(관광지 12 · 문화시설 14 · 레포츠 28 · 쇼핑 38)는 관광지

/** 상세(소개 · 이용시간 · 휴무 · 사진 여러 장 · 무장애 정보)를 모아 조사표 칸으로 */
export async function tourToRecord(item: TourItem): Promise<Partial<PlaceRecord>> {
  const id = item.contentid;
  const [common, intro, images, withTour] = await Promise.all([
    call("KorService2/detailCommon2", { contentId: id }).catch(() => []),
    call("KorService2/detailIntro2", { contentId: id, contentTypeId: item.contenttypeid }).catch(
      () => [],
    ),
    call("KorService2/detailImage2", { contentId: id, imageYN: "Y" }).catch(() => []),
    call("KorWithService2/detailWithTour2", { contentId: id }).catch(() => []), // 무장애 서비스 활용 신청이 없으면 빈 값
  ]);
  const c = common[0] ?? {};
  const it = intro[0] ?? {};
  const w = withTour[0] ?? {};
  const strip = (s?: string) =>
    (s ?? "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const photos = [item.firstimage, ...images.map((i) => i.originimgurl)].filter(
    (u): u is string => !!u,
  );
  const uniq = [...new Set(photos.map((u) => u.replace(/^http:\/\//, "https://")))].slice(0, 6);
  // 관광공사는 값이 없으면 빈 문자열을 준다 — 빈 칸을 건너뛰려고 ?? 가 아니라 || 를 쓴다
  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
  const usetime = strip(
    it.usetime || it.opentimefood || it.usetimeculture || it.usetimeleports || it.opentime,
  );
  const rest = strip(
    it.restdate ||
      it.restdatefood ||
      it.restdateculture ||
      it.restdateleports ||
      it.restdateshopping,
  );
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
  const access = [
    ["휠체어", w.wheelchair],
    ["출입통로", w.exit],
    ["엘리베이터", w.elevator],
    ["화장실", w.restroom],
    ["주차", w.parking],
  ]
    .map(([k, v]) => (strip(v) ? `${String(k)}: ${strip(v)}` : ""))
    .filter(Boolean);
  const notes = [
    usetime && `[관광공사 이용시간] ${usetime}`,
    rest && `[관광공사 쉬는 날] ${rest}`,
    access.length > 0 && `[관광공사 무장애] ${access.join(" / ")}`,
    strip(c.overview).slice(0, 200) && `[소개] ${strip(c.overview).slice(0, 200)}`,
    `TourAPI contentid=${id}`,
  ].filter(Boolean);
  return {
    장소명: item.title,
    유형: TYPE[item.contenttypeid] ?? "관광지",
    지역: "목포",
    주소: [item.addr1, item.addr2].filter(Boolean).join(" "),
    전화: item.tel ?? "",
    위도: item.mapy ?? "",
    경도: item.mapx ?? "",
    사진URL: uniq.join(" | "),
    비고: notes.join("\n"),
    확인상태: "미확인",
  };
}
