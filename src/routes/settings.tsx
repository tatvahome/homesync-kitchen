import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/homesync/app-shell";
import { cn } from "@/lib/utils";
import { Bell, Ruler, Download, KeyRound, Clock } from "lucide-react";
import { useSetting } from "@/hooks/use-setting";
import { SETTING_KEYS, db } from "@/lib/db";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — homeSync" },
      { name: "description", content: "Preferences, units, and integrations." },
    ],
  }),
  component: SettingsPage,
});

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-soft transition-transform",
          on ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-5 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h2>
      <div className="mx-5 divide-y divide-border/60 overflow-hidden rounded-2xl bg-card shadow-soft">
        {children}
      </div>
    </section>
  );
}

function Row({ icon, label, hint, right }: { icon: React.ReactNode; label: string; hint?: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

function SettingsPage() {
  const [reminderDays, setReminderDays] = useSetting(SETTING_KEYS.reminderDays, "3");
  const [unit, setUnit] = useSetting(SETTING_KEYS.defaultUnit, "kg");
  const [push, setPush] = useSetting(SETTING_KEYS.notifPush, "true");
  const [email, setEmail] = useSetting(SETTING_KEYS.notifEmail, "false");
  const [apiKey, setApiKey] = useSetting(SETTING_KEYS.geminiKey, "");

  const clearAll = async () => {
    if (!confirm("Clear all pantry data?")) return;
    await db().items.clear();
    await db().activity.clear();
  };

  return (
    <AppShell showFab={false}>
      <header className="px-5 pt-10 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personalize how homeSync works.</p>
      </header>

      <div className="space-y-6">
        <Section title="Reminders">
          <Row
            icon={<Clock className="h-4 w-4" />}
            label="Reminder timing"
            hint="Nudge after item opened for this many days"
            right={
              <select
                value={reminderDays}
                onChange={e => void setReminderDays(e.target.value)}
                className="rounded-lg bg-muted px-2 py-1.5 text-sm"
              >
                <option value="1">1 day</option>
                <option value="2">2 days</option>
                <option value="3">3 days</option>
                <option value="5">5 days</option>
              </select>
            }
          />
        </Section>

        <Section title="Units">
          <Row
            icon={<Ruler className="h-4 w-4" />}
            label="Default unit"
            hint="Used for new pantry items"
            right={
              <div className="flex rounded-full bg-muted p-0.5 text-xs font-medium">
                {(["kg", "pc"] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => void setUnit(u)}
                    className={cn(
                      "rounded-full px-3 py-1 transition",
                      unit === u ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
                    )}
                  >
                    ₹/{u}
                  </button>
                ))}
              </div>
            }
          />
        </Section>

        <Section title="Notifications">
          <Row
            icon={<Bell className="h-4 w-4" />}
            label="Push notifications"
            right={<Toggle on={push === "true"} onChange={v => void setPush(String(v))} />}
          />
          <Row
            icon={<Bell className="h-4 w-4" />}
            label="Email digest"
            hint="Weekly summary"
            right={<Toggle on={email === "true"} onChange={v => void setEmail(String(v))} />}
          />
        </Section>

        <Section title="Data">
          <Row
            icon={<Download className="h-4 w-4" />}
            label="Clear local data"
            hint="Removes all pantry items and activity"
            right={
              <button onClick={clearAll} className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium">
                Clear
              </button>
            }
          />
        </Section>

        <Section title="AI">
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <KeyRound className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Gemini API key</p>
                <p className="text-xs text-muted-foreground">
                  {apiKey ? "Stored locally on this device" : "Required for scanning"}
                </p>
              </div>
            </div>
            <input
              value={apiKey}
              onChange={e => void setApiKey(e.target.value)}
              type="password"
              placeholder="AIza…"
              className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-secondary"
            />
          </div>
        </Section>
      </div>
    </AppShell>
  );
}