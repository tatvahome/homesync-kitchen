import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ArrowRight, Trash2 } from "lucide-react";
import { AppShell } from "@/components/homesync/app-shell";
import { ReminderCard } from "@/components/homesync/reminder-card";
import { StatusDot, statusLabel } from "@/components/homesync/status-dot";
import { usePantry } from "@/components/homesync/store";
import { MOCK_ACTIVITY, MOCK_NUDGES } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "homeSync — Fridge Inventory" },
      { name: "description", content: "A calm, smart fridge inventory tracker." },
      { property: "og:title", content: "homeSync" },
      { property: "og:description", content: "A calm, smart fridge inventory tracker." },
    ],
  }),
  component: HomePage,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function HomePage() {
  const { items, consume, clear, reset } = usePantry();
  const [dismissedNudges, setDismissedNudges] = useState<string[]>([]);
  const [bannerHidden, setBannerHidden] = useState(false);

  const alerts = items
    .filter(i => i.status !== "fresh")
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const isEmpty = items.length === 0;
  const nudges = MOCK_NUDGES.filter(n => !dismissedNudges.includes(n.id));

  return (
    <AppShell pulseFab={isEmpty}>
      <header className="px-5 pt-10 pb-6">
        <p className="text-sm text-muted-foreground">{today}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {greeting()}.
        </h1>
      </header>

      {isEmpty ? (
        <EmptyState onReset={reset} />
      ) : (
        <div className="space-y-7 px-5">
          {!bannerHidden && items.length <= 3 && (
            <button
              onClick={() => setBannerHidden(true)}
              className="w-full rounded-2xl bg-primary/10 px-4 py-3 text-left text-sm text-primary"
            >
              🌱 Welcome to homeSync — {items.length} item{items.length === 1 ? "" : "s"} tracked
              <span className="float-right text-xs opacity-60">dismiss</span>
            </button>
          )}

          {nudges.length > 0 && (
            <section>
              <SectionTitle>Smart nudges</SectionTitle>
              <div className="mt-3 space-y-2">
                {nudges.map(n => (
                  <ReminderCard
                    key={n.id}
                    emoji={n.emoji}
                    message={n.message}
                    onYes={() => setDismissedNudges(d => [...d, n.id])}
                    onNo={() => setDismissedNudges(d => [...d, n.id])}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-baseline justify-between">
              <SectionTitle>Today's alerts</SectionTitle>
              <Link to="/pantry" className="text-xs font-medium text-secondary">
                View pantry <ArrowRight className="ml-0.5 inline h-3 w-3" />
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {alerts.length === 0 ? (
                <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
                  Nothing expiring soon. Nice work. ✨
                </p>
              ) : (
                alerts.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-soft"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-xl">
                      {a.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.status === "expired" ? "Expired" : "Use soon"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
                      <StatusDot status={a.status} />
                      {statusLabel(a.daysLeft)}
                    </div>
                    <button
                      onClick={() => consume(a.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                      aria-label="Consume"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <SectionTitle>Recent activity</SectionTitle>
            <ul className="mt-3 divide-y divide-border/60 rounded-2xl bg-card shadow-soft">
              {MOCK_ACTIVITY.map(a => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={
                      a.kind === "added"
                        ? "h-2 w-2 rounded-full bg-status-fresh"
                        : a.kind === "consumed"
                          ? "h-2 w-2 rounded-full bg-secondary"
                          : "h-2 w-2 rounded-full bg-status-expired"
                    }
                  />
                  <span className="flex-1 text-sm">{a.text}</span>
                  <span className="text-xs text-muted-foreground">{a.when}</span>
                </li>
              ))}
            </ul>
          </section>

          <button
            onClick={clear}
            className="mx-auto block text-xs text-muted-foreground/70 underline-offset-2 hover:underline"
          >
            Demo: clear pantry to see empty state
          </button>
        </div>
      )}
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </h2>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="mx-5 mt-10 flex flex-col items-center rounded-3xl bg-card px-6 py-12 text-center shadow-soft">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl">
        🎉
      </div>
      <h2 className="font-display text-2xl font-semibold">Empty Fridge Awaits</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Snap your first item and homeSync will start tracking freshness, price, and quantity for you.
      </p>
      <Link
        to="/scan"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-medium text-secondary-foreground shadow-fab"
      >
        <Sparkles className="h-4 w-4" /> Take First Photo
      </Link>
      <button
        onClick={onReset}
        className="mt-4 text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        Demo: load sample items
      </button>
    </div>
  );
}
