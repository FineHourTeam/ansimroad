// 안심로드 Cloud Functions (서울 리전)
//  - tourapi: 관리자 페이지의 한국관광공사 TourAPI 호출을 대신한다. Hosting rewrite /api/tourapi/** → 이 함수.
//    운영진(이메일 로그인 + admins/{uid})만 쓸 수 있다. 서비스 키는 시크릿 TOURAPI_KEY.
//    키 등록: npx firebase functions:secrets:set TOURAPI_KEY  (에뮬레이터는 functions/.secret.local)
//  - cleanupExpiredTrips: 매일 03:00(서울) 만료 여행 정리
//  - linkPreview: 부모님 링크(/t/{token}) 카카오톡 미리보기 카드 — Hosting rewrite /t/** → 이 함수가 앱 HTML 에 여행별 og 제목을 넣는다
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { htmlOrigin, injectMeta, previewTitle, seniorToken, SITE, SLOGAN } from "./linkPreview.js";
import { apiPath, upstreamUrl } from "./tourapi.js";

initializeApp();
const TOURAPI_KEY = defineSecret("TOURAPI_KEY");

async function isAdmin(authorization: string | undefined): Promise<boolean> {
  const token = /^Bearer (.+)$/.exec(authorization ?? "")?.[1];
  if (!token) return false;
  try {
    const { uid } = await getAuth().verifyIdToken(token);
    return (await getFirestore().doc(`admins/${uid}`).get()).exists;
  } catch (e) {
    logger.warn("운영진 확인 실패", e);
    return false;
  }
}

export const tourapi = onRequest(
  { region: "asia-northeast3", secrets: [TOURAPI_KEY], maxInstances: 2, timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("GET only");
      return;
    }
    const path = apiPath(req.path);
    if (!path) {
      res.status(404).send("not found");
      return;
    }
    if (!(await isAdmin(req.get("authorization")))) {
      res.status(403).send("운영진만 쓸 수 있어요");
      return;
    }
    try {
      const upstream = await fetch(
        upstreamUrl(path, req.query as Record<string, unknown>, TOURAPI_KEY.value()),
      );
      res
        .status(upstream.status)
        .type(upstream.headers.get("content-type") ?? "application/json")
        .set("Cache-Control", "private, max-age=300")
        .send(await upstream.text());
    } catch {
      res.status(502).send("TourAPI 에 연결하지 못했어요");
    }
  },
);

// 부모님 링크 미리보기: 앱 HTML(Hosting 의 /index.html)을 1분 동안 기억해 두고, 여행 날짜 · 코스 이름을 og 제목에 넣어 돌려준다.
// 어르신이 링크를 열 때도 이 함수를 거치므로 실패해도 앱은 열려야 한다 — 여행을 못 찾으면 기본 제목, HTML 을 못 받으면 지난 HTML.
const HTML_TTL_MS = 60_000;
const htmlCache = new Map<string, { html: string; at: number }>();

async function appHtml(origin: string): Promise<string | null> {
  const hit = htmlCache.get(origin);
  if (hit && Date.now() - hit.at < HTML_TTL_MS) return hit.html;
  try {
    const res = await fetch(`${origin}/index.html`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`index.html ${String(res.status)}`);
    const html = await res.text();
    htmlCache.set(origin, { html, at: Date.now() });
    return html;
  } catch (e) {
    logger.warn("앱 HTML 을 받지 못했어요", e);
    return hit?.html ?? null;
  }
}

async function tripTitle(token: string): Promise<string | null> {
  const db = getFirestore();
  const link = await db.doc(`links/${token}`).get();
  if (!link.exists || link.get("role") !== "senior") return null;
  const trip = await db.doc(`trips/${String(link.get("tripId"))}`).get();
  const date: unknown = trip.get("input.date");
  const title: unknown = trip.get("course.title");
  return typeof date === "string" && typeof title === "string" ? previewTitle(date, title) : null;
}

export const linkPreview = onRequest(
  { region: "asia-northeast3", maxInstances: 10, timeoutSeconds: 15, memory: "256MiB" },
  async (req, res) => {
    const html = await appHtml(htmlOrigin(req.get("x-forwarded-host")));
    if (!html) {
      res.status(503).set("Retry-After", "5").type("text/plain").send("잠시 후 다시 열어 주세요");
      return;
    }
    let title = SITE;
    const token = seniorToken(req.path);
    if (token) {
      try {
        title = (await tripTitle(token)) ?? SITE;
      } catch (e) {
        logger.warn("미리보기용 여행을 읽지 못했어요", e);
      }
    }
    res
      .status(200)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .type("html")
      .send(injectMeta(html, { title, description: SLOGAN }));
  },
);

// 만료 정리 (F-23 · 개인정보 처리방침 3항): 여행일 + 30일이 지난 여행의 사진 · 기록 · 링크를 매일 새벽에 지운다.
// 장소별 공개 후기(placeReviews)는 누가 썼는지 남지 않는 공개 데이터라 남긴다.
export const cleanupExpiredTrips = onSchedule(
  {
    region: "asia-northeast3",
    schedule: "every day 03:00",
    timeZone: "Asia/Seoul",
    timeoutSeconds: 540,
  },
  async () => {
    const db = getFirestore();
    const bucket = getStorage().bucket();
    const expired = await db
      .collection("trips")
      .where("expiresAt", "<", Timestamp.now())
      .limit(200)
      .get();
    let failed = 0;
    for (const trip of expired.docs) {
      // 한 건이 실패해도 나머지는 지운다 (실패한 건은 다음 날 다시 시도)
      try {
        await bucket.deleteFiles({ prefix: `trips/${trip.id}/` });
        const links = await db.collection("links").where("tripId", "==", trip.id).get();
        const writer = db.bulkWriter();
        links.docs.forEach((l) => void writer.delete(l.ref));
        await writer.close();
        await db.recursiveDelete(trip.ref); // 사진 메타 · 후기 · 합류 기록 · 위치 기록까지
      } catch (e) {
        failed += 1;
        logger.error(`만료 여행 정리 실패 ${trip.id}`, e);
      }
    }
    logger.info(`만료 여행 ${String(expired.size - failed)}건 정리, 실패 ${String(failed)}건`);
  },
);
