import { Link } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";

export function ScanFAB({ pulse = false }: { pulse?: boolean }) {
  const haptic = useHaptics();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-50 flex justify-center">
      <Link
        to="/scan"
        onClick={() => haptic("light")}
        aria-label="Scan item"
        className={cn(
          "pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-fab transition active:scale-95",
          pulse && "animate-fab-pulse",
        )}
      >
        <Camera className="h-6 w-6" />
      </Link>
    </div>
  );
}