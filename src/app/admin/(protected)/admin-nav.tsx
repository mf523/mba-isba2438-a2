"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/briefs", label: "Briefs" },
  { href: "/admin/ideas", label: "Ideas" },
  { href: "/admin/blogs", label: "Blog posts" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/contacts", label: "Contact requests" },
  { href: "/admin/about-page", label: "About page" },
  { href: "/admin/site-config", label: "Site config" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="admin-nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload so admin edits are visible immediately */}
      <a href="/">View site</a>
    </nav>
  );
}
