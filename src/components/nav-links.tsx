"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const active = (href: string) =>
    // The most specific matching link wins, so /counter/pickup doesn't also light up /counter.
    items
      .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href === href;

  return (
    <nav aria-label="Main" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto pb-1 md:order-none md:w-auto md:pb-0">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active(item.href) ? "page" : undefined}
          className="rounded-full border-2 border-transparent px-3 py-1.5 text-sm font-bold whitespace-nowrap hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-turmeric"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
