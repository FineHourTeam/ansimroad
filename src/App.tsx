import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { router } from "@/app/router";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/query-client";
import { initAnalytics } from "@/shared/lib/analytics";
import { captureDemoClock } from "@/shared/lib/clock";

// 시연·검수용 ?now= 시계와 통계는 앱 시작 때 한 번
captureDemoClock(window.location.search);
initAnalytics();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
