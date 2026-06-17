import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { ScanFAB } from "./fab";

export function AppShell({
  children,
  showFab = true,
  pulseFab = false,
}: {
  children: ReactNode;
  showFab?: boolean;
  pulseFab?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-md pb-32">{children}</div>
      {showFab && <ScanFAB pulse={pulseFab} />}
      <BottomNav />
    </div>
  );
}