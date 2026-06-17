import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  presets?: number[];
  suffix?: string;
  className?: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  presets = [1, 2, 6, 12],
  suffix,
  className,
}: StepperProps) {
  const [custom, setCustom] = useState(false);
  const holdRef = useRef<number | null>(null);
  const lastTap = useRef(0);
  const haptic = useHaptics();

  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const bump = (dir: 1 | -1) => {
    haptic("selection");
    onChange(clamp(value + dir * step));
  };

  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const startRapid = (dir: 1 | -1) => {
    bump(dir);
    holdRef.current = window.setInterval(() => {
      const next = clamp(valueRef.current + dir * step);
      valueRef.current = next;
      onChange(next);
    }, 90);
  };
  const stopHold = () => {
    if (holdRef.current) {
      window.clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      const next = presets.find(p => p > value) ?? presets[0];
      haptic("light");
      onChange(next);
    }
    lastTap.current = now;
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Decrease"
          onPointerDown={() => startRapid(-1)}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onPointerLeave={stopHold}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground transition active:scale-95"
        >
          <Minus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleDoubleTap}
          className="min-w-[5rem] rounded-2xl px-4 py-3 text-center font-display text-3xl font-semibold tabular-nums"
        >
          {value}
          {suffix && <span className="ml-1 text-base font-normal text-muted-foreground">{suffix}</span>}
        </button>
        <button
          type="button"
          aria-label="Increase"
          onPointerDown={() => startRapid(1)}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onPointerLeave={stopHold}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        {presets.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => { haptic("selection"); onChange(p); }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              value === p ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(c => !c)}
          className="ml-1 text-xs font-medium text-secondary underline-offset-2 hover:underline"
        >
          {custom ? "hide" : "custom"}
        </button>
      </div>
      {custom && (
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={e => onChange(clamp(Number(e.target.value)))}
          className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-center text-sm"
        />
      )}
    </div>
  );
}