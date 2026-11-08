export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  credentials?: { username: string; password: string };
}

export function text(form: FormData, name: string, max = 500) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function integer(form: FormData, name: string) {
  const value = Number(text(form, name, 20));
  return Number.isInteger(value) ? value : null;
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,30}$/;
export const USERNAME_HINT = "نام کاربری باید ۳ تا ۳۰ حرف انگلیسی، عدد یا یکی از نشانه‌های _ . - باشد.";
export const PASSWORD_HINT = "رمز عبور باید دست‌کم ۸ کاراکتر باشد.";
