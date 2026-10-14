// 안심로드 Cloud Functions (서울 리전)
//  - tourapi: 관리자 페이지의 한국관광공사 TourAPI 호출을 대신한다. Hosting rewrite /api/tourapi/** → 이 함수.
//    운영진(이메일 로그인 + admins/{uid})만 쓸 수 있다. 서비스 키는 시크릿 TOURAPI_KEY.
//    키 등록: npx firebase functions:secrets:set TOURAPI_KEY  (에뮬레이터는 functions/.secret.local)
//  - cleanupExpiredTrips: 매일 03:00(서울) 만료 여행 정리
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
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
