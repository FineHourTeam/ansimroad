import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { ErrorIcon, InfoIcon, LoadingIcon, SuccessIcon, WarningIcon } from "@/components/icons";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group print:hidden"
      containerAriaLabel="알림"
      icons={{
        success: <SuccessIcon size="sm" />,
        info: <InfoIcon size="sm" />,
        warning: <WarningIcon size="sm" />,
        error: <ErrorIcon size="sm" />,
        loading: <LoadingIcon size="sm" className="animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "calc(var(--radius) + 4px)",
          // sonner 기본 CSS 가 시스템 글꼴을 박아 둬서, 인라인으로 앱 글꼴을 이어 받는다
          fontFamily: "var(--font-sans)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          title: "font-semibold",
        },
        // sonner 기본 13px 은 자녀 · 어르신 화면에 작다 — 본문 크기(16px)로
        style: { fontSize: "1rem", boxShadow: "var(--shadow-sm)" },
      }}
      {...props}
    />
  );
};

export { Toaster };
