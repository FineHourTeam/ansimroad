// 에뮬레이터 REST 도우미 (테스트 전용). "Bearer owner" 는 에뮬레이터에서 보안 규칙을 건너뛰는 관리자 토큰이다.
export const PROJECT = "modam-5eb63";
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = "http://127.0.0.1:9099";
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };

export const ADMIN = { email: "admin@test.local", password: "test123456!" }; // docs/TEST_ACCOUNTS.md
export const NOT_ADMIN = { email: "user@test.local", password: "test123456!" };

type Value =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values: Value[] } }
  | { mapValue: { fields: Record<string, Value> } };

export function toValue(v: unknown): Value {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: toFields(v as Record<string, unknown>) } };
}

export function toFields(o: Record<string, unknown>): Record<string, Value> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));
}

async function ok(res: Response, what: string): Promise<Response> {
  if (!res.ok) throw new Error(`${what} 실패 (${String(res.status)}): ${await res.text()}`);
  return res;
}

export async function clearEmulators(): Promise<void> {
  await ok(
    await fetch(
      `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
      { method: "DELETE" },
    ),
    "Firestore 비우기",
  );
  await ok(
    await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" }),
    "Auth 비우기",
  );
}

/** 여러 문서를 한 번에 쓴다 (path 예: "places/A0018") */
export async function writeDocs(
  docs: { path: string; data: Record<string, unknown> }[],
): Promise<void> {
  for (let i = 0; i < docs.length; i += 400) {
    const writes = docs.slice(i, i + 400).map((d) => ({
      update: {
        name: `projects/${PROJECT}/databases/(default)/documents/${d.path}`,
        fields: toFields(d.data),
      },
    }));
    await ok(
      await fetch(`${FS}:batchWrite`, {
        method: "POST",
        headers: OWNER,
        body: JSON.stringify({ writes }),
      }),
      "문서 쓰기",
    );
  }
}

export async function getDoc(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${FS}/${path}`, { headers: OWNER });
  if (res.status === 404) return null;
  await ok(res, "문서 읽기");
  return (await res.json()) as Record<string, unknown>;
}

/** 테스트가 넣은 문서를 지운다 */
export async function deleteDoc(path: string): Promise<void> {
  await ok(await fetch(`${FS}/${path}`, { method: "DELETE", headers: OWNER }), "문서 지우기");
}

export async function listDocs(
  collectionPath: string,
): Promise<{ name: string; fields: Record<string, unknown> }[]> {
  const res = await ok(
    await fetch(`${FS}/${collectionPath}?pageSize=500`, { headers: OWNER }),
    "목록 읽기",
  );
  const json = (await res.json()) as {
    documents?: { name: string; fields: Record<string, unknown> }[];
  };
  return json.documents ?? [];
}

/** 계정을 만들고 uid 를 돌려준다. 이미 있으면 로그인해서 uid 를 얻는다 (여러 번 실행해도 안전) */
export async function ensureUser(email: string, password: string): Promise<string> {
  const call = (op: string) =>
    fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:${op}?key=e2e`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
  let res = await call("signUp");
  if (!res.ok && (await res.clone().text()).includes("EMAIL_EXISTS"))
    res = await call("signInWithPassword");
  await ok(res, "계정 만들기");
  return ((await res.json()) as { localId: string }).localId;
}
