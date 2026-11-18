import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import AdminNav from "./admin-nav";
import { logout } from "../login/actions";

async function AdminShell({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell">
      <div className="admin-bar">
        <span className="admin-badge">Admin mode</span>
        <AdminNav />
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
