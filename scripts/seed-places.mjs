#!/usr/bin/env node
// 장소 데이터 적재: 조사표 CSV(35칸) → Firestore places/{ID}. 앱과 같은 파서 · 검증 규칙(src/shared/data)을 그대로 쓴다.
// 검증에서 빠지는 행은 넣지 않고 이유를 보여 준다. 같은 ID 는 덮어쓴다 (운영진 페이지의 CSV 가져오기와 같다).
//
// 사용: node scripts/seed-places.mjs [CSV 경로=public/data/places.demo.csv] [--emulator] [--dry-run]
// 인증: 실제 프로젝트는 gcloud 로그인 계정의 액세스 토큰 (보안 규칙이 아니라 IAM 권한으로 쓴다). 프로젝트는 .firebaserc 의 default.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "vite";

const args = process.argv.slice(2);
const emulator = args.includes("--emulator");
const dryRun = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--")) ?? "public/data/places.demo.csv";
const project = JSON.parse(readFileSync(".firebaserc", "utf8")).projects.default;

// 앱 코드(@/ 별칭 · TS)를 vite 로 불러온다
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
let records;
let places;
let skipped;
try {
  const { parseCsv } = await vite.ssrLoadModule("/src/shared/data/csv.ts");
  const { toRecords, recordsToPlaces } = await vite.ssrLoadModule("/src/shared/data/placeRecords.ts");
  records = toRecords(parseCsv(readFileSync(file, "utf8")));
  ({ places, skipped } = recordsToPlaces(records));
} finally {
  await vite.close();
}

const valid = new Set(places.map((p) => p.id));
const toWrite = records.filter((r) => valid.has(r.ID));
console.log(`${file}: ${String(records.length)}행 → 넣을 장소 ${String(toWrite.length)}곳, 빠진 행 ${String(skipped.length)}개`);
for (const s of skipped) console.log(`  빠짐: ${String(s.row)}행 ${s.id || "(ID 없음)"} — ${s.reason}`);
if (dryRun || toWrite.length === 0) process.exit(0);

const base = emulator
  ? `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const headers = emulator
  ? { Authorization: "Bearer owner", "Content-Type": "application/json" }
  : {
      Authorization: `Bearer ${execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim()}`,
      "x-goog-user-project": project, // gcloud 기본 할당량 프로젝트가 달라도 이 프로젝트로 청구
      "Content-Type": "application/json",
    };

for (let i = 0; i < toWrite.length; i += 400) {
  const writes = toWrite.slice(i, i + 400).map((r) => ({
    update: {
      name: `projects/${project}/databases/(default)/documents/places/${r.ID}`,
      fields: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { stringValue: v }])),
    },
  }));
  const res = await fetch(`${base}:batchWrite`, { method: "POST", headers, body: JSON.stringify({ writes }) });
  if (!res.ok) throw new Error(`쓰기 실패 (${String(res.status)}): ${await res.text()}`);
}
console.log(`${emulator ? "에뮬레이터" : project}에 장소 ${String(toWrite.length)}곳을 넣었어요.`);
