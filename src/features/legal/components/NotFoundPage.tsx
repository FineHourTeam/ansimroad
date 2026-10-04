import { Link, useRouteError } from "react-router";
import { paths } from "@/app/paths";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { MapPinIcon, WarningIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { PageBody, StateMessage } from "@/shared/components/common";

/** 길 잃은 화면 위쪽의 로고 (누르면 첫 화면) */
function BrandHeader() {
  return (
    <header className="mx-auto flex h-14 max-w-3xl items-center px-4">
      <Link to={paths.home} className="inline-flex min-h-11 items-center">
        <BrandLogo height={28} />
      </Link>
    </header>
  );
}

export function NotFoundPage() {
  return (
    <>
      <Seo title="페이지를 찾을 수 없어요" noindex />
      <BrandHeader />
      <PageBody>
        <StateMessage title="페이지를 찾을 수 없어요" icon={<MapPinIcon size="lg" />}>
          <p className="text-muted-foreground">주소를 다시 확인해 주세요.</p>
          <Button asChild size="xl" className="mt-2 px-8">
            <Link to={paths.home}>처음으로</Link>
          </Button>
        </StateMessage>
      </PageBody>
    </>
  );
}

/** 화면을 그리다 오류가 나면 (라우터 errorElement) */
export function ErrorPage() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  return (
    <>
      <Seo title="잠시 문제가 생겼어요" noindex />
      <BrandHeader />
      <PageBody>
        <StateMessage title="잠시 문제가 생겼어요" icon={<WarningIcon size="lg" />}>
          <p className="text-muted-foreground">새로고침하면 대부분 해결돼요.</p>
          <div className="mt-2 flex gap-2">
            <Button
              size="xl"
              onClick={() => {
                window.location.reload();
              }}
            >
              새로고침
            </Button>
            <Button variant="outline" size="xl" asChild>
              <a href={paths.home}>처음으로</a>
            </Button>
          </div>
        </StateMessage>
      </PageBody>
    </>
  );
}
