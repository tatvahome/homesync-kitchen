import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-md rounded-t-3xl bg-card shadow-soft animate-sheet-up",
          "max-h-[85vh] overflow-y-auto",
          className,
        )}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="mx-auto mt-3 mb-2 block h-1.5 w-12 rounded-full bg-muted-foreground/30"
        />
        {title && <h3 className="px-6 pb-3 text-lg font-semibold">{title}</h3>}
        <div className="px-6 pb-8">{children}</div>
      </div>
    </div>
  );
}