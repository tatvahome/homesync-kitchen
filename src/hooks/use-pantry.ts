import { useLiveQuery } from "dexie-react-hooks";
import { db, computeStatus, daysLeft, relativeTime, type DbItem } from "@/lib/db";
import type { PantryItem } from "@/lib/mock-data";

export function toPantryItem(row: DbItem): PantryItem {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    daysLeft: daysLeft(row.expiryEstimate),
    status: computeStatus(row.expiryEstimate),
    price: row.price,
    unit: row.unit,
    quantity: row.quantity,
    addedAt: relativeTime(row.dateAdded),
  };
}

export function usePantryItems(): PantryItem[] | undefined {
  const rows = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return db().items.orderBy("dateAdded").reverse().toArray();
  }, []);
  return rows?.map(toPantryItem);
}

export function useActivity(limit = 6) {
  return useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    const rows = await db().activity.orderBy("timestamp").reverse().limit(limit).toArray();
    return rows.map(r => ({
      id: String(r.id),
      text: r.text,
      when: relativeTime(r.timestamp),
      kind: r.kind === "added" ? "added" : r.kind === "consumed" || r.kind === "bulk" ? "consumed" : "expired",
    }));
  }, [limit]) ?? [];
}

export function useNudges(thresholdDays: number) {
  return useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    const cutoff = Date.now() - thresholdDays * 86_400_000;
    const rows = await db().items.toArray();
    return rows
      .filter(r => r.dateOpened != null && r.dateOpened < cutoff && (r.lastConfirmed == null || r.lastConfirmed < r.dateOpened))
      .slice(0, 3)
      .map(r => ({ id: r.id, emoji: r.emoji, message: `${r.name} opened ${Math.round((Date.now() - (r.dateOpened ?? 0)) / 86_400_000)} days ago — still good?` }));
  }, [thresholdDays]) ?? [];
}