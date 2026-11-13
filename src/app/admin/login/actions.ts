"use server";

import { redirect } from "next/navigation";
import {
  createAdminSession,
  destroyAdminSession,
  isCorrectAdminPassword,
} from "@/lib/session";
import {
  isLoginAllowed,
  recordLoginFailure,
  resetLoginAttempts,
} from "@/lib/rate-limit";
import type { LoginFormState } from "./login-state";

const LOGIN_KEY = "admin-login";

export async function login(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  if (!isLoginAllowed(LOGIN_KEY)) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }
  const password = String(formData.get("password") ?? "");
  if (!isCorrectAdminPassword(password)) {
    recordLoginFailure(LOGIN_KEY);
    return { error: "Incorrect password." };
  }
  resetLoginAttempts(LOGIN_KEY);
  await createAdminSession();
  redirect("/admin/site-config");
}

export async function logout(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}
