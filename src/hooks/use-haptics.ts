import { useCallback } from "react";

type HapticPattern = "light" | "medium" | "heavy" | "success" | "error" | "selection";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 35,
  selection: 5,
  success: [10, 40, 20],
  error: [30, 60, 30],
};

export function useHaptics() {
  return useCallback((pattern: HapticPattern = "light") => {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      // ignore
    }
  }, []);
}