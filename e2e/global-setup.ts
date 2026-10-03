// E2E 준비: (E2E_RESET=1 이면 에뮬레이터를 비우고) 장소 데이터(public/data/places.demo.csv) · 운영진 계정 · 공개 추천 코스를 넣는다.
import { readFileSync } from "node:fs";
import { parseCsv } from "../src/shared/data/csv";
import { recordsToPlaces, toRecords } from "../src/shared/data/placeRecords";
import type { CuratedStop } from "../src/shared/domain/types";
import { ADMIN, clearEmulators, ensureUser, NOT_ADMIN, writeDocs } from "./support/emulator";
import { CURATED_TITLE } from "./support/fixtures";

export default async function globalSetup(): Promise<void> {
  // 여러 실행이 같은 에뮬레이터를 함께 쓸 수 있게 기본은 덮어쓰기만 한다 (CI · 최종 검증은 E2E_RESET=1)
  if (process.env.E2E_RESET === "1") await clearEmulators();

  const records = toRecords(parseCsv(readFileSync("public/data/places.demo.csv", "utf8")));
  await writeDocs(records.map((r) => ({ path: `places/${r.ID}`, data: r })));

  const adminUid = await ensureUser(ADMIN.email, ADMIN.password);
  await ensureUser(NOT_ADMIN.email, NOT_ADMIN.password); // 운영진 명단에 없는 계정
  await writeDocs([{ path: `admins/${adminUid}`, data: { email: ADMIN.email } }]);

  // 공개된 운영진 추천 코스 1개 (S2 · S2-1 에서 보인다)
  const { places } = recordsToPlaces(records);
  const pick = (type: string, n = 0) => {
    const p = places.filter((x) => x.type === type)[n];
    if (!p) throw new Error(`시드: ${type} 장소가 없어요`);
    return p;
  };
  const plan: [ReturnType<typeof pick>, CuratedStop["role"]][] = [
    [pick("관광지", 0), "am"],
    [pick("식당", 0), "lunch"],
    [pick("관광지", 1), "pm"],
    [pick("카페휴식", 0), "cafe"],
  ];
  const stops: CuratedStop[] = plan.map(([p, role], i) => ({
    id: `seed${String(i)}`,
    placeId: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    role,
    stayMin: p.stayMin ?? 60,
    desc: "운영진이 직접 걸어 본 길이에요",
    photos: [],
  }));
  await writeDocs([
    {
      path: "curated/seed-course",
      data: {
        title: CURATED_TITLE,
        summary: "케이블카와 바다 풍경을 천천히",
        stops,
        published: true,
        updatedAt: "2026-10-01T09:00:00.000Z",
      },
    },
  ]);
}
