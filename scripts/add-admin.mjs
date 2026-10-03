#!/usr/bin/env node
// 운영진 등록: 이미 만든 Firebase Auth 계정(이메일)을 admins/{uid} 명단에 올린다.
// 계정 자체는 Firebase 콘솔 → Authentication → 사용자 추가 에서 만든다 (비밀번호는 이 스크립트가 다루지 않는다).
//
// 사용: node scripts/add-admin.mjs <이메일> [--remove]
// 인증: gcloud 로그인 계정의 액세스 토큰 (gcloud auth login). 프로젝트는 .firebaserc 의 default.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [email, flag] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error("사용법: node scripts/add-admin.mjs <이메일> [--remove]");
  process.exit(1);
}
const project = JSON.parse(readFileSync(".firebaserc", "utf8")).projects.default;
const token = execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
const headers = {
  Authorization: `Bearer ${token}`,
  "x-goog-user-project": project, // gcloud 기본 할당량 프로젝트가 달라도 이 프로젝트로 청구
  "Content-Type": "application/json",
};

const lookup = await fetch(
  `https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`,
  {
    method: "POST",
    headers,
    body: JSON.stringify({ email: [email] }),
  },
);
if (!lookup.ok) throw new Error(`계정 조회 실패 (${lookup.status}): ${await lookup.text()}`);
const user = (await lookup.json()).users?.[0];
if (!user) {
  console.error(
    `${email} 계정이 없어요. Firebase 콘솔 → Authentication → 사용자 추가 에서 먼저 만들어 주세요.`,
  );
  process.exit(1);
}

const docUrl = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/admins/${user.localId}`;
const res =
  flag === "--remove"
    ? await fetch(docUrl, { method: "DELETE", headers })
    : await fetch(docUrl, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          fields: {
            email: { stringValue: email },
            addedAt: { stringValue: new Date().toISOString() },
          },
        }),
      });
if (!res.ok) throw new Error(`명단 저장 실패 (${res.status}): ${await res.text()}`);
console.log(
  flag === "--remove"
    ? `${email} 운영진 권한을 뺐어요.`
    : `${email} (${user.localId}) 운영진으로 등록했어요.`,
);
