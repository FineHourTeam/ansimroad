// 내 카톡·문자로 보내 두기 (모담 제안 2026-10-29): 자녀용 링크를 휴대폰 공유 창으로 자기에게 보내 둔다.
// 공유 창이 없는 곳(PC · 일부 인앱)은 같은 글을 복사한다. 휴대폰 번호를 받거나 사이트가 문자를 보내지 않는다.
import { CopyIcon, ShareIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { TripSnapshot } from "@/shared/domain/types";
import { canWebShare } from "@/shared/lib/share";
import { sendFamilyLinkToSelf } from "../lib/links";

export function SelfLinkButton({ trip, url }: { trip: TripSnapshot; url: string }) {
  const shareable = canWebShare();
  return (
    <Button variant="outline" size="xl" onClick={() => void sendFamilyLinkToSelf(trip, url)}>
      {shareable ? <ShareIcon /> : <CopyIcon />}
      {shareable ? "내 카톡·문자로 보내 두기" : "자녀용 링크 복사해 두기"}
    </Button>
  );
}
