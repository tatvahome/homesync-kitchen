import { Check, X } from "lucide-react";
import { useHaptics } from "@/hooks/use-haptics";

interface ReminderProps {
  emoji: string;
  message: string;
  onYes: () => void;
  onNo: () => void;
}

export function ReminderCard({ emoji, message, onYes, onNo }: ReminderProps) {
  const haptic = useHaptics();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-soft">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
        {emoji}
      </div>
      <p className="flex-1 text-sm leading-snug">{message}</p>
      <div className="flex gap-1.5">
        <button
          onClick={() => { haptic("light"); onYes(); }}
          aria-label="Yes"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary active:scale-95"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={() => { haptic("error"); onNo(); }}
          aria-label="No"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}