// 부모님 링크 보내기 버튼: 카카오톡(웹 공유가 되는 기기) + 링크 복사.
// 공유 창이 없는 기기(안드로이드 카카오톡 인앱 · PC 파이어폭스 등)는 카카오 버튼 대신 '일정 글 복사'(글째 복사해 붙여 넣기, S3 상태 · 예외)
import { CopyIcon, ShareIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { TripSnapshot } from "@/shared/domain/types";
import { canWebShare } from "@/shared/lib/share";
import { copyLink, sendSeniorLink } from "../lib/links";

export function SeniorShareButtons({ trip, url }: { trip: TripSnapshot; url: string }) {
  const shareable = canWebShare();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button
        variant={shareable ? "kakao" : "outline"}
        size="xl"
        onClick={() => void sendSeniorLink(trip, url)}
      >
        {shareable ? <ShareIcon /> : <CopyIcon />}
        {shareable ? "카카오톡으로 보내기" : "일정 글 복사"}
      </Button>
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
