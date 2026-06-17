import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { db, setSetting } from "@/lib/db";

export function useSetting(key: string, fallback = ""): [string, (v: string) => Promise<void>] {
  const value = useLiveQuery(async () => {
    if (typeof window === "undefined") return fallback;
    const r = await db().settings.get(key);
    return r?.value ?? fallback;
  }, [key]);
  const setter = useCallback((v: string) => setSetting(key, v), [key]);
  return [value ?? fallback, setter];
}