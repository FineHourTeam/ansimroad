// 운영진 로그인: 이메일·비밀번호 + admins/{uid} 문서가 있어야 운영진. 계정·명단은 콘솔(또는 scripts/add-admin.mjs)로만 만든다.
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type AdminState =
  | { status: "loading" }
  | { status: "guest" } // 로그인 안 함 (익명 로그인 포함)
  | { status: "forbidden"; email: string } // 로그인했지만 운영진 명단에 없음
  | { status: "admin"; user: User };

async function resolve(user: User | null): Promise<AdminState> {
  if (!user || user.isAnonymous) return { status: "guest" };
  const snap = await getDoc(doc(db, "admins", user.uid));
  return snap.exists()
    ? { status: "admin", user }
    : { status: "forbidden", email: user.email ?? "" };
}

export function subscribeAdminState(cb: (s: AdminState) => void): () => void {
  let seq = 0;
  return onAuthStateChanged(auth, (user) => {
    const mine = ++seq;
    resolve(user).then(
      (s) => {
        if (mine === seq) cb(s);
      },
      () => {
        if (mine === seq) cb({ status: "forbidden", email: user?.email ?? "" });
      },
    );
  });
}

export async function adminSignIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function adminSignOut(): Promise<void> {
  await signOut(auth);
}
