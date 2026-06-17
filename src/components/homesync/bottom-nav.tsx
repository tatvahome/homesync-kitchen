import { Link, useLocation } from "@tanstack/react-router";
import { Home, Salad, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/pantry", label: "Pantry", Icon: Salad },
  { to: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="flex">
              <Link
                to={to}
                className={cn(
                  "flex w-full flex-col items-center gap-1 px-4 pt-3 pb-2 text-[11px] font-medium transition-colors",
                  active ? "text-secondary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5 transition", active && "scale-110")} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}