// 보안 규칙 대조 (firestore.rules · storage.rules) — 브라우저 없이 Firebase SDK로 에뮬레이터에 직접 붙어 확인한다.
// 링크 토큰 → 합류 → 역할별 읽기·쓰기 권한이 화면 설계와 같은지, 남의 여행은 못 보는지.
import { expect, test } from "@playwright/test";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage";
import { ADMIN, PROJECT } from "./support/emulator";
import { firstCourse, INPUT } from "./support/fixtures";

test.describe.configure({ mode: "serial" });

interface Client {
  app: FirebaseApp;
  db: Firestore;
  storage: FirebaseStorage;
  uid: string;
}

let n = 0;
async function client(admin = false): Promise<Client> {
  n += 1;
  const app = initializeApp(
    {
      apiKey: "e2e",
      projectId: PROJECT,
      storageBucket: `${PROJECT}.firebasestorage.app`,
      authDomain: "localhost",
    },
    `rules-${String(n)}-${String(Date.now())}`,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const storage = getStorage(app);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  const cred = admin
    ? await signInWithEmailAndPassword(auth, ADMIN.email, ADMIN.password)
    : await signInAnonymously(auth);
  return { app, db, storage, uid: cred.user.uid };
}

const denied = async (p: Promise<unknown>) => {
  const code = await p.then(
    () => "allowed",
    (e: unknown) => String((e as { code?: string }).code),
  );
  expect(code).toMatch(/permission-denied|storage\/unauthorized/);
};

const rand = () => Math.random().toString(36).slice(2, 12).padEnd(10, "x");
const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 86_400_000));
const clients: Client[] = [];
test.afterAll(async () => {
  await Promise.all(clients.map((c) => deleteApp(c.app)));
});

async function createTrip(c: Client, until = expiresAt) {
  const expiresAt = until;
  const tripRef = doc(collection(c.db, "trips"));
  const seniorToken = `S${rand()}`;
  const familyToken = `F${rand()}`;
  const b = writeBatch(c.db);
  b.set(tripRef, {
    ownerUid: c.uid,
    createdAt: new Date().toISOString(),
    input: INPUT,
    course: JSON.parse(JSON.stringify(firstCourse())) as Record<string, unknown>,
    memos: {},
    expiresOn: "2099-01-01",
    expiresAt,
  });
  b.set(doc(c.db, "trips", tripRef.id, "members", `${c.uid}_family`), {
    role: "family",
    token: familyToken,
  });
  b.set(doc(c.db, "links", seniorToken), { tripId: tripRef.id, role: "senior", expiresAt });
  b.set(doc(c.db, "links", familyToken), {
    tripId: tripRef.id,
    role: "family",
    expiresAt,
    seniorToken,
  });
  await b.commit();
  return { tripId: tripRef.id, seniorToken, familyToken };
}

async function join(c: Client, tripId: string, token: string, role: string) {
  await setDoc(doc(c.db, "trips", tripId, "members", `${c.uid}_${role}`), { role, token });
}

test("확정 → 어르신 · 자녀 · 리포트 권한이 화면 설계대로 나뉜다", async () => {
  const owner = await client();
  const senior = await client();
  const other = await client();
  const reportViewer = await client();
  clients.push(owner, senior, other, reportViewer);

  const { tripId, seniorToken, familyToken } = await createTrip(owner);
  const course = firstCourse() as unknown as Record<string, unknown>;
  // 만료가 아주 먼 여행은 만들 수 없다 (사진 저장소를 계속 쓰지 못하게)
  await denied(createTrip(owner, Timestamp.fromDate(new Date("9999-12-31"))));

  // 남은 토큰 없이 여행을 읽을 수 없다 · 링크 목록을 훑을 수 없다
  await denied(getDoc(doc(other.db, "trips", tripId)));
  await denied(getDocs(collection(other.db, "links")));
  // 남의 토큰 역할로 합류할 수 없다 (어르신 토큰으로 자녀 합류)
  await denied(join(other, tripId, seniorToken, "family"));
  // 다른 여행의 토큰으로 합류할 수 없다
  await denied(join(other, "nope-trip", seniorToken, "senior"));

  // 어르신: 토큰으로 합류 → 코스 읽기 · 사진 올리기 O, 코스 고치기 X
  expect((await getDoc(doc(senior.db, "links", seniorToken))).data()?.role).toBe("senior");
  await join(senior, tripId, seniorToken, "senior");
  expect((await getDoc(doc(senior.db, "trips", tripId))).exists()).toBe(true);
  await denied(setDoc(doc(senior.db, "trips", tripId), { course: {} }, { merge: true }));
  const photoRef = doc(collection(senior.db, "trips", tripId, "photos"));
  const fileRef = ref(senior.storage, `trips/${tripId}/photos/${photoRef.id}.jpg`);
  await uploadBytes(fileRef, new Uint8Array([255, 216, 255, 217]), { contentType: "image/jpeg" });
  const photo = {
    takenAt: new Date().toISOString(),
    url: await getDownloadURL(fileRef),
    width: 10,
    height: 10,
    lat: null,
    lng: null,
    locationStatus: "off",
    by: "senior",
  };
  // 외부 주소(추적 이미지) · 다른 사람 행세(by) · 이상한 파일 이름은 막힌다
  await denied(setDoc(photoRef, { ...photo, url: "https://evil.example/track.gif" }));
  await denied(setDoc(photoRef, { ...photo, by: "family" }));
  await denied(
    uploadBytes(ref(senior.storage, `trips/${tripId}/photos/anything.bin`), new Uint8Array([1]), {
      contentType: "image/jpeg",
    }),
  );
  await setDoc(photoRef, photo);
  // 어르신은 자녀 링크(어르신 토큰이 든 문서)를 몰라 자녀 권한을 얻을 수 없다
  await denied(join(senior, tripId, familyToken.replace(/.$/, "Z"), "family"));

  // 자녀: 코스 수정 · 후기 · 여행 완료
  await updateDoc(doc(owner.db, "trips", tripId), { course: { ...course, title: "고친 코스" } });
  await denied(updateDoc(doc(owner.db, "trips", tripId), { course: { stops: "nope" } })); // 깨진 코스
  // 자녀: 장소 메모 · 여행 날짜(날짜 칸만, 보관 기한까지) 고치기 — 어르신은 못 고친다
  await updateDoc(doc(owner.db, "trips", tripId), { "memos.A0018": "예약했어요" });
  await denied(updateDoc(doc(senior.db, "trips", tripId), { "memos.A0018": "어르신" }));
  const expiresOn = String((await getDoc(doc(owner.db, "trips", tripId))).data()?.expiresOn);
  await updateDoc(doc(owner.db, "trips", tripId), { "input.date": expiresOn });
  await denied(updateDoc(doc(owner.db, "trips", tripId), { "input.date": "9999-12-31" }));
  await denied(updateDoc(doc(owner.db, "trips", tripId), { "input.transport": "bus" }));
  await denied(updateDoc(doc(owner.db, "trips", tripId), { expiresOn: "2098-01-01" })); // 보관 기한은 못 바꾼다
  await updateDoc(doc(owner.db, "trips", tripId), { "input.date": INPUT.date });
  const b = writeBatch(owner.db);
  b.set(doc(owner.db, "trips", tripId, "reviews", "A0018"), {
    rating: 5,
    text: "좋았어요",
    priv: false,
    at: serverTimestamp(),
  });
  b.set(doc(owner.db, "placeReviews", "A0018", "items", tripId), {
    rating: 5,
    text: "좋았어요",
    at: serverTimestamp(),
  });
  b.set(doc(owner.db, "trips", tripId, "reviews", "A0099"), {
    rating: 2,
    text: "나만 볼래요",
    priv: true,
    at: serverTimestamp(),
  });
  await b.commit();
  // 먼 미래 날짜로 최신 후기 자리를 차지할 수 없다 · 자녀가 아닌 사람은 후기를 남길 수 없다
  await denied(
    setDoc(doc(owner.db, "placeReviews", "A0018", "items", tripId), {
      rating: 5,
      text: "",
      at: "9999-12-31",
    }),
  );
  await denied(
    setDoc(doc(senior.db, "placeReviews", "A0018", "items", tripId), {
      rating: 1,
      text: "",
      at: serverTimestamp(),
    }),
  );

  const reportToken = `R${rand()}`;
  const done = writeBatch(owner.db);
  done.set(
    doc(owner.db, "trips", tripId),
    { completedAt: new Date().toISOString(), reportToken },
    { merge: true },
  );
  done.set(doc(owner.db, "links", reportToken), { tripId, role: "report", expiresAt });
  done.set(doc(owner.db, "trips", tripId, "public", "report"), {
    date: INPUT.date,
    course: { ...course, title: "고친 코스" },
    expiresOn: "2099-01-01",
    completedAt: new Date().toISOString(),
  });
  await done.commit();
  // 리포트 토큰은 다시 바꿀 수 없다 · 마친 여행은 날짜를 못 바꾼다 (리포트 날짜와 어긋나지 않게)
  await denied(
    setDoc(doc(owner.db, "trips", tripId), { reportToken: `R${rand()}` }, { merge: true }),
  );
  await denied(updateDoc(doc(owner.db, "trips", tripId), { "input.date": expiresOn }));

  // 리포트: 읽기만, 공개 후기만
  await join(reportViewer, tripId, reportToken, "report");
  // 리포트 링크는 여행 문서(메모 · 나이대 · 이동 불편)를 못 읽고 공개본만 읽는다
  await denied(getDoc(doc(reportViewer.db, "trips", tripId)));
  expect(
    (await getDoc(doc(reportViewer.db, "trips", tripId, "public", "report"))).data()?.course,
  ).toMatchObject({
    title: "고친 코스",
  });
  await denied(
    setDoc(
      doc(reportViewer.db, "trips", tripId, "public", "report"),
      { date: "x" },
      { merge: true },
    ),
  );
  const pub = await getDocs(
    query(collection(reportViewer.db, "trips", tripId, "reviews"), where("priv", "==", false)),
  );
  expect(pub.docs.map((d) => d.id)).toEqual(["A0018"]);
  await denied(getDocs(collection(reportViewer.db, "trips", tripId, "reviews"))); // 나만 보기 후기까지는 못 읽는다
  expect((await getDocs(collection(reportViewer.db, "trips", tripId, "photos"))).size).toBe(1);
  await denied(setDoc(doc(reportViewer.db, "trips", tripId, "photos", "p2"), { url: "x" }));

  // 공개 후기 모음은 누구나 읽는다
  expect(
    (await getDocs(collection(other.db, "placeReviews", "A0018", "items"))).size,
  ).toBeGreaterThan(0);
});

test("장소 · 추천 코스는 누구나 읽고 운영진만 쓴다", async () => {
  const guest = await client();
  const admin = await client(true);
  clients.push(guest, admin);
  expect((await getDocs(collection(guest.db, "places"))).size).toBeGreaterThan(0);
  await denied(setDoc(doc(guest.db, "places", "HACK"), { ID: "HACK" }));
  await denied(getDocs(collection(guest.db, "curated"))); // 비공개까지 훑기 X
  expect(
    (await getDocs(query(collection(guest.db, "curated"), where("published", "==", true)))).size,
  ).toBeGreaterThan(0);

  await setDoc(doc(admin.db, "places", "E2E-RULES"), { ID: "E2E-RULES", 장소명: "규칙 확인" });
  await setDoc(doc(admin.db, "curated", "e2e-rules"), {
    title: "비공개",
    published: false,
    stops: [],
    summary: "",
    updatedAt: "x",
  });
  expect((await getDocs(collection(admin.db, "curated"))).size).toBeGreaterThan(0);
  await uploadBytes(ref(admin.storage, "curated/e2e-rules/a.png"), new Uint8Array([1, 2, 3]), {
    contentType: "image/png",
  });
  await denied(
    uploadBytes(ref(guest.storage, "curated/e2e-rules/b.png"), new Uint8Array([1]), {
      contentType: "image/png",
    }),
  );
  const cleanup = writeBatch(admin.db);
  cleanup.delete(doc(admin.db, "places", "E2E-RULES"));
  cleanup.delete(doc(admin.db, "curated", "e2e-rules"));
  await cleanup.commit();
});
