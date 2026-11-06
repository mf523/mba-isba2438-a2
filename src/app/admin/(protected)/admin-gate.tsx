import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";

export default async function AdminGate({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }
  return <>{children}</>;
}
