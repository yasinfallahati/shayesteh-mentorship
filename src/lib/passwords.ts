import { randomBytes, randomInt, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 32;

function encode(salt: Buffer, key: Buffer) {
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return encode(salt, await scryptAsync(password, salt, KEY_LENGTH, PARAMS));
}

export function hashPasswordSync(password: string) {
  const salt = randomBytes(16);
  return encode(salt, scryptSync(password, salt, KEY_LENGTH, PARAMS));
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const actual = await scryptAsync(
    password,
    Buffer.from(salt, "base64url"),
    expected.length,
    PARAMS,
  );
  return timingSafeEqual(actual, expected);
}

export function generatePassword(length = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}
