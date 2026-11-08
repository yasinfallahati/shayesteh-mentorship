import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { DAY_MS, subscriptionState } from "./subscription";

const COOKIE = "mentor_session";

export interface User {
  id: number;
  role: "admin" | "student";
  username: string;
  password_hash: string;
  full_name: string;
  phone: string;
  track_id: number | null;
  is_active: number;
  subscription_ends_at: number | null;
  created_at: number;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function startSession(user: Pick<User, "id" | "role">) {
  const token = randomBytes(32).toString("base64url");
  const lifetime = user.role === "admin" ? DAY_MS : 30 * DAY_MS;
  const expiresAt = Date.now() + lifetime;
  const database = db();
  database.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  database
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(hashToken(token), user.id, expiresAt);
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  store.delete(COOKIE);
}

/** Signs a user out everywhere except, when given, the session in use now. */
export async function revokeOtherSessions(userId: number) {
  const token = (await cookies()).get(COOKIE)?.value;
  db()
    .prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?")
    .run(userId, token ? hashToken(token) : "");
}

export const currentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const user = db()
    .prepare(
      `SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .get(hashToken(token), Date.now()) as User | undefined;
  return user && user.is_active ? user : null;
});

export async function requireStudent() {
  const user = await currentUser();
  if (!user || user.role !== "student") redirect("/login");
  return user;
}

/** For everything behind the subscription: videos, exams and the dashboard. */
export async function requireOpenStudent() {
  const user = await requireStudent();
  if (subscriptionState(user.subscription_ends_at, Date.now()).phase === "blocked") {
    redirect("/panel/billing");
  }
  return user;
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user || user.role !== "admin") redirect("/login");
  return user;
}
