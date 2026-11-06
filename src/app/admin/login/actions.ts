"use server";

import { redirect } from "next/navigation";
import {
  createAdminSession,
  destroyAdminSession,
  isCorrectAdminPassword,
} from "@/lib/session";
import type { LoginFormState } from "./login-state";

export async function login(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const password = String(formData.get("password") ?? "");
  if (!isCorrectAdminPassword(password)) {
    return { error: "Incorrect password." };
  }
  await createAdminSession();
  redirect("/admin/site-config");
}

export async function logout(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}
