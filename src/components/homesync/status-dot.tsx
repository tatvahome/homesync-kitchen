import { cn } from "@/lib/utils";
import type { ItemStatus } from "@/lib/mock-data";

const STATUS_COLOR: Record<ItemStatus, string> = {
  fresh: "bg-status-fresh",
  expiring: "bg-status-expiring",
  expired: "bg-status-expired",
};

export function StatusDot({ status, className }: { status: ItemStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full transition-colors duration-500",
        STATUS_COLOR[status],
        status === "expired" && "ring-2 ring-status-expired/25",
        className,
      )}
    />
  );
}

export function statusLabel(daysLeft: number) {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d ago`;
  if (daysLeft === 0) return "today";
  return `${daysLeft}d`;
}