import { useEffect, useState } from "react";
import { MOCK_ITEMS, type PantryItem } from "@/lib/mock-data";

let items: PantryItem[] = [...MOCK_ITEMS];
const listeners = new Set<() => void>();
function emit() { listeners.forEach(l => l()); }

export function usePantry() {
  const [snap, setSnap] = useState(items);
  useEffect(() => {
    const l = () => setSnap([...items]);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return {
    items: snap,
    consume(id: string) { items = items.filter(i => i.id !== id); emit(); },
    add(item: PantryItem) { items = [item, ...items]; emit(); },
    clear() { items = []; emit(); },
    reset() { items = [...MOCK_ITEMS]; emit(); },
  };
}