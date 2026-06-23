import { ChevronDown, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PantryItem } from "@/lib/mock-data";
import { StatusDot, statusLabel } from "./status-dot";
import { useHaptics } from "@/hooks/use-haptics";

interface ItemCardProps {
  item: PantryItem;
  expanded: boolean;
  onToggle: () => void;
  onConsume: () => void;
  onEdit: () => void;
}

export function ItemCard({ item, expanded, onToggle, onConsume, onEdit }: ItemCardProps) {
  const haptic = useHaptics();
  return (
    <div className={cn(
      "overflow-hidden rounded-2xl bg-card shadow-soft transition-all",
      expanded && "ring-1 ring-border",
    )}>
      <button
        type="button"
        onClick={() => { haptic("selection"); onToggle(); }}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
          {item.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
            {item.quantity} {item.unit} · ₹{item.price}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
          <StatusDot status={item.status} />
          <span>{statusLabel(item.daysLeft)}</span>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/60 px-4 py-3">
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Price</dt>
                <dd className="font-medium">₹{item.price}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Qty</dt>
                <dd className="font-medium">{item.quantity} {item.unit}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Added</dt>
                <dd className="font-medium">{item.addedAt}</dd>
              </div>
            </dl>
            <div className="mt-3 flex gap-2">
              <button
                onClick={onConsume}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground active:scale-[0.98]"
              >
                <Check className="h-4 w-4" /> Consume
              </button>
              <button
                onClick={onEdit}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-sm font-medium text-accent-foreground active:scale-[0.98]"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}