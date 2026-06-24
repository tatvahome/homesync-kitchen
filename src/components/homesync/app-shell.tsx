import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { ScanFAB } from "./fab";
import { useOnline } from "@/hooks/use-online";
import { WifiOff } from "lucide-react";

export function AppShell({
  children,
  showFab = true,
  pulseFab = false,
}: {
  children: ReactNode;
  showFab?: boolean;
  pulseFab?: boolean;
}) {
  const online = useOnline();
  return (
    <div className="min-h-dvh bg-background">
      {!online && (
        <div
          role="status"
          className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-foreground/90 px-4 py-1.5 text-center text-[11px] font-medium text-background backdrop-blur"
        >
          <WifiOff className="h-3 w-3" />
          You're offline — scanning unavailable, but your pantry is here.
        </div>
      )}
      <div className="mx-auto max-w-md pb-32">{children}</div>
      {showFab && <ScanFAB pulse={pulseFab} />}
      <BottomNav />
    </div>
  );
}