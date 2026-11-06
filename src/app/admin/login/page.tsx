import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Admin Login",
};

async function RedirectIfAuthenticated() {
  if (await isAdmin()) {
    redirect("/admin/site-config");
  }
  return null;
}

export default function AdminLoginPage() {
  return (
    <>
      <h1>Admin Login</h1>
      <p>Enter the admin password to switch to admin mode.</p>
      <Suspense fallback={null}>
        <RedirectIfAuthenticated />
      </Suspense>
      <LoginForm />
    </>
  );
}
