// 운영진 로그인 (/admin/login): 이메일 · 비밀번호만. 계정 만들기는 콘솔 · 스크립트로만 한다.
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { useAdminSignIn, useAdminState } from "../hooks/useAdmin";
import { paths } from "@/app/paths";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/shared/components/common";

const schema = z.object({
  email: z.email("이메일 형식이 아니에요. @를 넣어 다시 적어 주세요"),
  password: z.string().min(1, "비밀번호를 적어 주세요"),
});
type Values = z.infer<typeof schema>;

/** Firebase Auth 오류 코드 → 원인 + 해결 */
function signInMessage(err: unknown): string {
  const code = typeof err === "object" && err !== null && "code" in err ? String(err.code) : "";
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    code === "auth/invalid-email"
  ) {
    return "이메일이나 비밀번호가 맞지 않아요. 다시 확인해 주세요";
  }
  if (code === "auth/too-many-requests")
    return "로그인 시도가 너무 많아요. 잠시 뒤에 다시 해 주세요";
  if (code === "auth/network-request-failed")
    return "인터넷 연결이 불안정해요. 연결을 확인하고 다시 해 주세요";
  if (code === "auth/user-disabled") return "사용이 멈춘 계정이에요. 모담팀에 문의해 주세요";
  return "로그인하지 못했어요. 잠시 뒤에 다시 해 주세요";
}

/** 로그인 전에 가려던 운영진 주소 (없으면 추천 코스 만들기) */
function backTo(state: unknown): string {
  const from = typeof state === "object" && state !== null && "from" in state ? state.from : null;
  return typeof from === "string" && from.startsWith("/admin") && from !== paths.login
    ? from
    : paths.admin;
}

export function AdminLoginPage() {
  const admin = useAdminState();
  const signIn = useAdminSignIn();
  const navigate = useNavigate();
  const location = useLocation();
  const target = backTo(location.state);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  // 로그인만 하는 화면이라 이메일 칸에 바로 커서를 둔다
  const showForm = admin.status !== "loading" && admin.status !== "admin";
  useEffect(() => {
    if (showForm) setFocus("email");
  }, [showForm, setFocus]);

  if (admin.status === "admin") return <Navigate to={target} replace />;

  const onSubmit = (v: Values) => {
    signIn.mutate(v, {
      onSuccess: () => void navigate(target, { replace: true }),
    });
  };

  return (
    <main className="bg-background-subtle flex min-h-dvh items-center justify-center px-4 py-12">
      <Seo title="운영진 로그인" noindex />
      {admin.status === "loading" ? (
        <Loading text="로그인 상태를 확인하고 있어요" />
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>
              <h1 className="text-primary text-xl font-bold">안심로드 운영진</h1>
            </CardTitle>
            <CardDescription>
              추천 코스와 장소 데이터는 운영진 계정으로 로그인해야 고칠 수 있어요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              noValidate
              onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-email">이메일</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  aria-invalid={errors.email ? true : undefined}
                  {...register("email")}
                />
                {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-password">비밀번호</Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? true : undefined}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-destructive text-sm">{errors.password.message}</p>
                )}
              </div>
              {signIn.isError && (
                <p role="alert" className="text-destructive text-sm font-semibold">
                  {signInMessage(signIn.error)}
                </p>
              )}
              <Button type="submit" size="lg" disabled={signIn.isPending}>
                {signIn.isPending ? "로그인하는 중이에요" : "로그인하기"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
