// 부모님 링크 보내기 버튼: 카카오톡(웹 공유가 되는 기기만) + 링크 복사
import { CopyIcon, ShareIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { TripSnapshot } from "@/shared/domain/types";
import { canWebShare } from "@/shared/lib/share";
import { copyLink, sendSeniorLink } from "../lib/links";

export function SeniorShareButtons({ trip, url }: { trip: TripSnapshot; url: string }) {
  const shareable = canWebShare();
  return (
    <div className={shareable ? "grid gap-2 sm:grid-cols-2" : "grid gap-2"}>
      {shareable && (
        <Button variant="kakao" size="xl" onClick={() => void sendSeniorLink(trip, url)}>
          <ShareIcon />
          카카오톡으로 보내기
        </Button>
      )}
      <Button
        variant="outline"
        size="xl"
        onClick={() => void copyLink(url, "부모님 링크를 복사했어요")}
      >
        <CopyIcon />
        부모님 링크 복사
      </Button>
    </div>
  );
}
