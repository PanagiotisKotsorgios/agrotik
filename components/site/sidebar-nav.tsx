"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";

interface Item {
  href: string;
  icon: IconName;
  label: string;
}

export function SidebarNav({ items }: { items: Item[] }) {
  const path = usePathname();
  // Pick the most specific match so /dashboard doesn't also light up when
  // /dashboard/profile is active.
  const matches = items
    .map((it) => ({ it, len: path?.startsWith(it.href) ? it.href.length : -1 }))
    .filter((m) => m.len > 0)
    .sort((a, b) => b.len - a.len);
  const activeHref = matches[0]?.it.href ?? null;

  return (
    <nav className="space-y-1">
      {items.map((it) => {
        const active = it.href === activeHref;
        return (
          <Link
            key={it.href}
            href={it.href}
            prefetch
            aria-current={active ? "page" : undefined}
            className={
              "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[15px] font-semibold transition-colors " +
              (active
                ? "bg-white text-brand-dark shadow-sm"
                : "text-white/85 hover:bg-white/10 hover:text-white")
            }
          >
            <Icon name={it.icon} className={(active ? "text-brand-earth" : "text-white/60") + " w-5 text-center text-[1.05em]"} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
