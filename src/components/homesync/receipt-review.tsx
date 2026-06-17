import { useMemo, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReceiptLineItem } from "@/lib/gemini";

interface Props {
  currency: string;
  items: ReceiptLineItem[];
  onConfirm: (selected: ReceiptLineItem[]) => Promise<void> | void;
}

export function ReceiptReview({ currency, items, onConfirm }: Props) {
  const [rows, setRows] = useState(items.map(i => ({ ...i, selected: i.likelyFridgeItem })));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedCount = useMemo(() => rows.filter(r => r.selected).length, [rows]);
  const total = useMemo(
    () => rows.filter(r => r.selected).reduce((sum, r) => sum + r.price, 0),
    [rows],
  );

  const update = (idx: number, patch: Partial<(typeof rows)[number]>) =>
    setRows(rs => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const submit = async () => {
    setSubmitting(true);
    try {
      await onConfirm(rows.filter(r => r.selected));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{rows.length} line items detected</span>
        <span>Total: {currency} {total.toFixed(2)}</span>
      </div>
      <ul className="max-h-[50vh] space-y-2 overflow-y-auto pb-2">
        {rows.map((r, idx) => {
          const isEditing = editingIdx === idx;
          return (
            <li
              key={idx}
              className={cn(
                "rounded-2xl border border-border/60 bg-card p-3 transition",
                !r.selected && "opacity-55",
                !r.likelyFridgeItem && "border-dashed",
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => update(idx, { selected: !r.selected })}
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition",
                    r.selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-transparent",
                  )}
                  aria-label="Toggle item"
                >
                  {r.selected && <Check className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={r.name}
                        onChange={e => update(idx, { name: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={r.quantity}
                          onChange={e => update(idx, { quantity: Number(e.target.value) || 0 })}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                          placeholder="Qty"
                        />
                        <input
                          type="number"
                          value={r.price}
                          onChange={e => update(idx, { price: Number(e.target.value) || 0 })}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                          placeholder="Price"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.quantity} {r.unit} · {currency} {r.price.toFixed(2)}
                        {!r.likelyFridgeItem && (
                          <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">non-fridge</span>
                        )}
                      </p>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingIdx(isEditing ? null : idx)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={selectedCount === 0 || submitting}
        onClick={submit}
        className={cn(
          "mt-4 w-full rounded-2xl py-3.5 text-sm font-medium transition active:scale-[0.99]",
          selectedCount === 0
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        {submitting
          ? "Adding…"
          : selectedCount === 0
            ? "Select items to add"
            : `Add ${selectedCount} item${selectedCount === 1 ? "" : "s"} to Pantry`}
      </button>
    </div>
  );
}