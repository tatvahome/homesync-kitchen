import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/homesync/app-shell";
import { SwipeableCard } from "@/components/homesync/swipeable-card";
import { ItemCard } from "@/components/homesync/item-card";
import { BottomSheet } from "@/components/homesync/bottom-sheet";
import { Stepper } from "@/components/homesync/stepper";
import { usePantryItems } from "@/hooks/use-pantry";
import { consumeItem, consumePartial, updateItem } from "@/lib/db";
import { cn } from "@/lib/utils";
import type { ItemStatus, PantryItem } from "@/lib/mock-data";
import { useHaptics } from "@/hooks/use-haptics";

export const Route = createFileRoute("/pantry")({
  head: () => ({
    meta: [
      { title: "Pantry — homeSync" },
      { name: "description", content: "Everything currently in your fridge." },
    ],
  }),
  component: PantryPage,
});

type Filter = "all" | ItemStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fresh", label: "Fresh" },
  { value: "expiring", label: "Expiring" },
  { value: "expired", label: "Expired" },
];

function PantryPage() {
  const items = usePantryItems() ?? [];
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [longPressItem, setLongPressItem] = useState<PantryItem | null>(null);
  const [consuming, setConsuming] = useState<PantryItem | null>(null);
  const [consumeAmount, setConsumeAmount] = useState("1");
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState(1);
  const [editPrice, setEditPrice] = useState(0);
  const [editDays, setEditDays] = useState(7);
  const haptic = useHaptics();

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter(i => i.status === filter)),
    [items, filter],
  );

  return (
    <AppShell>
      <header className="px-5 pt-10 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">Pantry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length} items · swipe right to consume, left to edit
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-1 bg-background/85 px-5 py-3 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { haptic("selection"); setFilter(f.value); }}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                filter === f.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 px-5 pt-3">
        {filtered.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
            No items match this filter.
          </p>
        ) : (
          filtered.map(item => (
            <SwipeableCard
              key={item.id}
              onSwipeRight={() => openConsume(item)}
              onSwipeLeft={() => openEdit(item)}
              onLongPress={() => setLongPressItem(item)}
            >
              <ItemCard
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(id => (id === item.id ? null : item.id))}
                onConsume={() => openConsume(item)}
                onEdit={() => openEdit(item)}
              />
            </SwipeableCard>
          ))
        )}
      </div>

      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.name}` : undefined}
      >
        {editing && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-3xl">
                {editing.emoji}
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border-b border-border bg-transparent pb-1 text-base font-medium outline-none focus:border-secondary"
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Quantity</p>
              <Stepper value={editQty} onChange={setEditQty} presets={[1, 2, 6, 12]} suffix={editing.unit} />
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Price (₹)</p>
              <Stepper value={editPrice} onChange={setEditPrice} step={5} presets={[50, 100, 200, 500]} />
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Expires in (days from now)</p>
              <Stepper value={editDays} onChange={setEditDays} presets={[3, 7, 14, 30]} suffix="d" />
            </div>
            <button
              onClick={async () => {
                if (editing) {
                  await updateItem(editing.id, {
                    name: editName,
                    quantity: editQty,
                    price: editPrice,
                    expiryEstimate: Date.now() + editDays * 86_400_000,
                  });
                }
                setEditing(null);
              }}
              className="w-full rounded-2xl bg-secondary py-3 text-sm font-medium text-secondary-foreground"
            >
              Save changes
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={!!consuming}
        onClose={() => setConsuming(null)}
        title={consuming ? `Consume ${consuming.name}` : undefined}
      >
        {consuming && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              In stock: <span className="font-medium text-foreground tabular-nums">{consuming.quantity} {consuming.unit}</span>
            </p>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Amount consumed ({consuming.unit})
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={consumeAmount}
                onChange={e => setConsumeAmount(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-lg tabular-nums outline-none focus:border-secondary"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {[0.25, 0.5, 1, consuming.quantity].map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setConsumeAmount(String(p))}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {i === 3 ? "All" : `${p} ${consuming.unit}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { void consumeItem(consuming.id); setConsuming(null); }}
                className="flex-1 rounded-2xl bg-muted py-3 text-sm font-medium"
              >
                Consume all
              </button>
              <button
                onClick={async () => {
                  const amt = Number(consumeAmount) || 0;
                  if (amt > 0) await consumePartial(consuming.id, amt);
                  setConsuming(null);
                }}
                className="flex-1 rounded-2xl bg-primary py-3 text-sm font-medium text-primary-foreground"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={!!longPressItem}
        onClose={() => setLongPressItem(null)}
        title={longPressItem ? longPressItem.name : undefined}
      >
        {longPressItem && (
          <div className="space-y-2">
            {[
              { label: "Remind me later", action: () => setLongPressItem(null) },
              { label: "Mark as discarded", action: () => { void consumeItem(longPressItem.id, "discarded"); setLongPressItem(null); } },
              { label: "Share with household", action: () => setLongPressItem(null) },
            ].map(opt => (
              <button
                key={opt.label}
                onClick={opt.action}
                className="w-full rounded-xl bg-muted px-4 py-3 text-left text-sm font-medium"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </AppShell>
  );

  function openEdit(item: PantryItem) {
    setEditing(item);
    setEditName(item.name);
    setEditQty(item.quantity);
    setEditPrice(item.price);
    setEditDays(Math.max(1, item.daysLeft > 0 ? item.daysLeft : 7));
  }

  function openConsume(item: PantryItem) {
    haptic("light");
    setConsuming(item);
    setConsumeAmount(String(item.quantity));
  }
}