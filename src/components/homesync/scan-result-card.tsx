import { useState } from "react";
import { Sparkles } from "lucide-react";
import { SwipeableCard } from "./swipeable-card";

interface ScanResultProps {
  emoji: string;
  initialName: string;
  confidence: number;
  onConfirm: (name: string) => void;
  onEdit: () => void;
}

export function ScanResultCard({ emoji, initialName, confidence, onConfirm, onEdit }: ScanResultProps) {
  const [name, setName] = useState(initialName);
  const pct = Math.round(confidence * 100);

  return (
    <SwipeableCard
      onSwipeRight={() => onConfirm(name)}
      onSwipeLeft={onEdit}
    >
      <div className="rounded-2xl bg-card p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-5xl">
            {emoji}
          </div>
          <div className="min-w-0 flex-1">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border-b border-transparent bg-transparent pb-1 text-lg font-semibold outline-none focus:border-secondary"
            />
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              <span>AI confidence</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-secondary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Swipe <span className="font-semibold text-primary">right to confirm</span> · <span className="font-semibold text-secondary">left to edit</span>
        </p>
      </div>
    </SwipeableCard>
  );
}