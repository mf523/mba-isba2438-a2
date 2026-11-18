import { Suspense } from "react";
import AdminGate from "./admin-gate";

export default function AdminPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <h1>{title}</h1>
      <Suspense fallback={null}>
        <AdminGate>
          {intro ? <p>{intro}</p> : null}
          {children}
        </AdminGate>
      </Suspense>
    </>
  );
}
