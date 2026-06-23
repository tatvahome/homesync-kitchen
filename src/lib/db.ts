import Dexie, { type Table } from "dexie";
import type { ItemStatus } from "./mock-data";

// NOTE: For this local-only MVP the Gemini API key is stored in IndexedDB
// in plain text. A production version should encrypt it at rest or route
// the call through a server proxy so the key never lives in the browser.

export interface DbItem {
  id: string;
  name: string;
  emoji: string;
  thumbnail?: string; // base64
  quantity: number;
  unit: string;
  price: number;
  dateAdded: number; // epoch ms
  dateOpened: number | null;
  lastConfirmed: number | null;
  expiryEstimate: number | null; // epoch ms when item is estimated to expire
  category: string;
}

export interface DbActivity {
  id?: number;
  itemId: string | null;
  text: string;
  kind: "added" | "consumed" | "discarded" | "edited" | "bulk";
  timestamp: number;
}

export interface DbSetting {
  key: string;
  value: string;
}

class HomeSyncDB extends Dexie {
  items!: Table<DbItem, string>;
  activity!: Table<DbActivity, number>;
  settings!: Table<DbSetting, string>;

  constructor() {
    super("homesync");
    this.version(1).stores({
      items: "id, name, dateAdded, expiryEstimate, category",
      activity: "++id, itemId, timestamp",
      settings: "key",
    });
  }
}

// Lazy singleton so we don't try to open IndexedDB during SSR
let _db: HomeSyncDB | null = null;
export function db(): HomeSyncDB {
  if (typeof window === "undefined") {
    // SSR-safe no-op proxy - useLiveQuery will skip on server
    return {} as HomeSyncDB;
  }
  if (!_db) {
    _db = new HomeSyncDB();
    void seed(_db);
  }
  return _db;
}

// -- helpers --

export function computeStatus(expiry: number | null): ItemStatus {
  if (expiry == null) return "fresh";
  const days = (expiry - Date.now()) / 86_400_000;
  if (days < 0) return "expired";
  if (days <= 2) return "expiring";
  return "fresh";
}

export function daysLeft(expiry: number | null): number {
  if (expiry == null) return 99;
  return Math.ceil((expiry - Date.now()) / 86_400_000);
}

export function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

// -- settings --

export const SETTING_KEYS = {
  geminiKey: "geminiApiKey",
  reminderDays: "reminderDays",
  defaultUnit: "defaultUnit",
  notifPush: "notifPush",
  notifEmail: "notifEmail",
} as const;

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await db().settings.get(key);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db().settings.put({ key, value });
}

// -- mutations --

export async function addItemFromScan(input: {
  name: string;
  emoji?: string;
  thumbnail?: string;
  quantity: number;
  unit?: string;
  price: number;
  estimatedDays?: number;
  category?: string;
}): Promise<string> {
  const id = `i_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();
  const expiry =
    input.estimatedDays != null ? now + input.estimatedDays * 86_400_000 : null;
  await db().items.put({
    id,
    name: input.name,
    emoji: input.emoji ?? "📦",
    thumbnail: input.thumbnail,
    quantity: input.quantity,
    unit: input.unit ?? "pc",
    price: input.price,
    dateAdded: now,
    dateOpened: null,
    lastConfirmed: null,
    expiryEstimate: expiry,
    category: input.category ?? "fridge",
  });
  await logActivity({ itemId: id, text: `${input.name} added`, kind: "added" });
  return id;
}

export async function bulkAddItems(
  inputs: Parameters<typeof addItemFromScan>[0][],
  source = "receipt scan",
): Promise<void> {
  const now = Date.now();
  const rows: DbItem[] = inputs.map((input, i) => {
    const id = `i_${now}_${i}_${Math.random().toString(36).slice(2, 6)}`;
    const expiry =
      input.estimatedDays != null ? now + input.estimatedDays * 86_400_000 : null;
    return {
      id,
      name: input.name,
      emoji: input.emoji ?? "📦",
      thumbnail: input.thumbnail,
      quantity: input.quantity,
      unit: input.unit ?? "pc",
      price: input.price,
      dateAdded: now,
      dateOpened: null,
      lastConfirmed: null,
      expiryEstimate: expiry,
      category: input.category ?? "fridge",
    };
  });
  await db().transaction("rw", db().items, db().activity, async () => {
    await db().items.bulkPut(rows);
    await db().activity.add({
      itemId: null,
      text: `${rows.length} items added via ${source}`,
      kind: "bulk",
      timestamp: now,
    });
  });
}

export async function consumeItem(id: string, mode: "consumed" | "discarded" = "consumed") {
  const item = await db().items.get(id);
  if (!item) return;
  await db().transaction("rw", db().items, db().activity, async () => {
    await db().items.delete(id);
    await logActivity({
      itemId: id,
      text: `${item.name} ${mode}`,
      kind: mode,
    });
  });
}

// Consume a partial amount. If the remaining quantity hits zero (or below),
// the item is deleted; otherwise its quantity is decremented.
export async function consumePartial(id: string, amount: number) {
  const item = await db().items.get(id);
  if (!item) return;
  const remaining = Math.max(0, Number((item.quantity - amount).toFixed(3)));
  await db().transaction("rw", db().items, db().activity, async () => {
    if (remaining <= 0) {
      await db().items.delete(id);
    } else {
      await db().items.update(id, { quantity: remaining });
    }
    await logActivity({
      itemId: id,
      text: `${item.name} — ${amount}${item.unit} consumed${remaining > 0 ? ` (${remaining}${item.unit} left)` : ""}`,
      kind: "consumed",
    });
  });
}

export async function updateItem(id: string, patch: Partial<DbItem>) {
  await db().items.update(id, patch);
  if (patch.name) {
    await logActivity({ itemId: id, text: `${patch.name} edited`, kind: "edited" });
  }
}

export async function confirmStillGood(id: string) {
  await db().items.update(id, { lastConfirmed: Date.now() });
}

export async function logActivity(input: Omit<DbActivity, "id" | "timestamp">) {
  await db().activity.add({ ...input, timestamp: Date.now() });
}

// -- seed (first run only) --

// First-run only: seeds the dev Gemini key the user supplied so the scan flow
// works out of the box. The user can overwrite or clear this in Settings.
const SEED_GEMINI_KEY = "AQ.Ab8RN6J0j7Oag0H5sbbNfPIaM2Mq9kWPqYPJB4gX_lM9QEoCDg";

async function seed(database: HomeSyncDB) {
  try {
    const existingKey = await database.settings.get(SETTING_KEYS.geminiKey);
    if (!existingKey) {
      await database.settings.put({ key: SETTING_KEYS.geminiKey, value: SEED_GEMINI_KEY });
    }
    const reminderDays = await database.settings.get(SETTING_KEYS.reminderDays);
    if (!reminderDays) {
      await database.settings.put({ key: SETTING_KEYS.reminderDays, value: "3" });
    }
    const count = await database.items.count();
    if (count === 0) {
      const now = Date.now();
      await database.items.bulkPut([
        sample("Whole Milk", "🥛", 1, 1, "L", 62, now - 3 * 86400000, now + 1 * 86400000),
        sample("Spinach", "🥬", 1, 1, "bunch", 40, now - 6 * 86400000, now - 1 * 86400000),
        sample("Eggs", "🥚", 12, 12, "pc", 84, now - 1 * 86400000, now + 9 * 86400000),
        sample("Greek Yogurt", "🍶", 2, 2, "pc", 110, now - 2 * 86400000, now + 5 * 86400000),
        sample("Tomatoes", "🍅", 1, 1, "kg", 30, now - 4 * 86400000, now + 2 * 86400000),
        sample("Cheddar", "🧀", 1, 1, "pc", 240, now, now + 14 * 86400000),
      ]);
    }
  } catch (e) {
    console.warn("seed failed", e);
  }
}

function sample(
  name: string,
  emoji: string,
  qty: number,
  qty2: number,
  unit: string,
  price: number,
  dateAdded: number,
  expiry: number,
): DbItem {
  void qty2;
  return {
    id: `seed_${name}`,
    name,
    emoji,
    quantity: qty,
    unit,
    price,
    dateAdded,
    dateOpened: null,
    lastConfirmed: null,
    expiryEstimate: expiry,
    category: "fridge",
  };
}