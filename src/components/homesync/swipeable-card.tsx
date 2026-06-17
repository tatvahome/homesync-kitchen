import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onLongPress?: () => void;
  className?: string;
  disabled?: boolean;
}

const THRESHOLD = 90;

export function SwipeableCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  onLongPress,
  className,
  disabled,
}: SwipeableCardProps) {
  const [dx, setDx] = useState(0);
  const [removing, setRemoving] = useState<"left" | "right" | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const haptic = useHaptics();

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (onLongPress) {
      longPressTimer.current = window.setTimeout(() => {
        haptic("medium");
        onLongPress();
        dragging.current = false;
      }, 550);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientX - startX.current;
    const dy = Math.abs(e.clientY - startY.current);
    if (Math.abs(delta) > 8 || dy > 8) cancelLongPress();
    if (dy > Math.abs(delta) + 6) return;
    setDx(delta);
  };

  const finish = () => {
    cancelLongPress();
    if (!dragging.current) return;
    dragging.current = false;
    if (dx > THRESHOLD && onSwipeRight) {
      haptic("medium");
      setRemoving("right");
      window.setTimeout(() => onSwipeRight(), 280);
      return;
    }
    if (dx < -THRESHOLD && onSwipeLeft) {
      haptic("light");
      setRemoving("left");
      window.setTimeout(() => {
        setRemoving(null);
        setDx(0);
        onSwipeLeft();
      }, 220);
      return;
    }
    setDx(0);
  };

  const rotate = dx / 24;
  const rightOpacity = Math.min(1, Math.max(0, dx / THRESHOLD));
  const leftOpacity = Math.min(1, Math.max(0, -dx / THRESHOLD));

  return (
    <div className={cn("relative touch-pan-y select-none", className)}>
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-start rounded-2xl bg-primary/10 pl-6 text-sm font-medium text-primary"
        style={{ opacity: rightOpacity }}
      >
        ✓ Consume
      </div>
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-2xl bg-secondary/10 pr-6 text-sm font-medium text-secondary"
        style={{ opacity: leftOpacity }}
      >
        ✎ Edit
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        className={cn(
          "relative will-change-transform",
          removing === "right" && "animate-swipe-out-right",
          removing === "left" && "animate-swipe-out-left",
          !removing && "transition-transform duration-200 ease-out",
        )}
        style={removing ? undefined : { transform: `translateX(${dx}px) rotate(${rotate}deg)` }}
      >
        {children}
      </div>
    </div>
  );
}