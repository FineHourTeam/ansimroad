import { useAdminSignOut } from "../hooks/useAdmin";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { PageBody, StateMessage } from "@/shared/components/common";

/** 로그인했지만 운영진 명단(admins)에 없는 계정 */
export function AdminForbidden({ email }: { email: string }) {
  const signOut = useAdminSignOut();
  return (
    <PageBody>
      <Seo title="운영진 전용" noindex />
      <StateMessage title="운영진 계정이 아니에요">
        <p className="text-muted-foreground">
          {email} 계정은 운영진 명단에 없어요. 모담팀에 등록을 부탁해 주세요.
        </p>
        <Button
          variant="outline"
          size="xl"
          className="mt-2"
          disabled={signOut.isPending}
          onClick={() => {
            signOut.mutate();
          }}
        >
          다른 계정으로 로그인하기
        </Button>
      </StateMessage>
    </PageBody>
  );
}
