import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import { logout } from "../login/actions";

async function AdminShell({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell">
      <div className="admin-bar">
        <span className="admin-badge">Admin mode</span>
        <nav aria-label="Admin navigation" className="admin-nav">
          <Link href="/admin/site-config">Site config</Link>
          <Link href="/admin/contacts">Contact requests</Link>
          <Link href="/">View site</Link>
        </nav>
        <form action={logout}>
          <button className="admin-logout" type="submit">
            Log out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}

export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="admin-shell admin-shell-loading" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
