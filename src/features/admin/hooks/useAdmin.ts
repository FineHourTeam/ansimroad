import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { adminSignIn, adminSignOut, subscribeAdminState, type AdminState } from "../api/auth";
import { resetQueryCache } from "@/lib/query-client";

/** 운영진 여부. Firebase Auth 초기화는 비동기라 "확인 중"을 거친다 (unknown-unknowns #12) */
export function useAdminState(): AdminState {
  const [state, setState] = useState<AdminState>({ status: "loading" });
  useEffect(() => subscribeAdminState(setState), []);
  return state;
}

export function useAdminSignIn() {
  return useMutation({
    mutationFn: (v: { email: string; password: string }) => adminSignIn(v.email, v.password),
    onSuccess: () => {
      resetQueryCache(); // 같은 탭에서 익명으로 열었던 링크 권한 캐시(uid가 바뀜)를 비운다
    },
  });
}

export function useAdminSignOut() {
  return useMutation({
    mutationFn: adminSignOut,
    onSuccess: () => {
      resetQueryCache(); // 다음 사람에게 이전 운영진 데이터가 보이지 않게
    },
  });
}
