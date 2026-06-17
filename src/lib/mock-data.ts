export type ItemStatus = "fresh" | "expiring" | "expired";

export interface PantryItem {
  id: string;
  name: string;
  emoji: string;
  daysLeft: number; // negative = expired
  status: ItemStatus;
  price: number;
  unit: string;
  quantity: number;
  addedAt: string;
}

export interface ActivityEntry {
  id: string;
  text: string;
  when: string;
  kind: "added" | "consumed" | "expired";
}

export interface ReminderNudge {
  id: string;
  emoji: string;
  message: string;
}

export const MOCK_ITEMS: PantryItem[] = [
  { id: "1", name: "Whole Milk", emoji: "🥛", daysLeft: 1, status: "expiring", price: 62, unit: "L", quantity: 1, addedAt: "3 days ago" },
  { id: "2", name: "Spinach", emoji: "🥬", daysLeft: -1, status: "expired", price: 40, unit: "bunch", quantity: 1, addedAt: "6 days ago" },
  { id: "3", name: "Eggs", emoji: "🥚", daysLeft: 9, status: "fresh", price: 84, unit: "pc", quantity: 12, addedAt: "yesterday" },
  { id: "4", name: "Greek Yogurt", emoji: "🍶", daysLeft: 5, status: "fresh", price: 110, unit: "pc", quantity: 2, addedAt: "2 days ago" },
  { id: "5", name: "Tomatoes", emoji: "🍅", daysLeft: 2, status: "expiring", price: 30, unit: "kg", quantity: 1, addedAt: "4 days ago" },
  { id: "6", name: "Cheddar", emoji: "🧀", daysLeft: 14, status: "fresh", price: 240, unit: "pc", quantity: 1, addedAt: "today" },
  { id: "7", name: "Strawberries", emoji: "🍓", daysLeft: 0, status: "expiring", price: 150, unit: "pc", quantity: 1, addedAt: "5 days ago" },
  { id: "8", name: "Chicken Breast", emoji: "🍗", daysLeft: 3, status: "fresh", price: 280, unit: "kg", quantity: 1, addedAt: "yesterday" },
  { id: "9", name: "Bread", emoji: "🍞", daysLeft: -2, status: "expired", price: 45, unit: "pc", quantity: 1, addedAt: "a week ago" },
  { id: "10", name: "Bell Peppers", emoji: "🫑", daysLeft: 7, status: "fresh", price: 60, unit: "kg", quantity: 1, addedAt: "today" },
];

export const MOCK_ACTIVITY: ActivityEntry[] = [
  { id: "a1", text: "Cheddar added", when: "10 min ago", kind: "added" },
  { id: "a2", text: "Bananas consumed", when: "2h ago", kind: "consumed" },
  { id: "a3", text: "Bread expired", when: "yesterday", kind: "expired" },
  { id: "a4", text: "Bell Peppers added", when: "yesterday", kind: "added" },
];

export const MOCK_NUDGES: ReminderNudge[] = [
  { id: "n1", emoji: "🥛", message: "Milk opened 3 days ago — still good?" },
];

export const MOCK_SCAN_RESULT = {
  emoji: "🥑",
  detectedName: "Avocado",
  confidence: 0.92,
  estimatedDays: 5,
  estimatedPrice: 80,
};