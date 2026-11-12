import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const N = 16384; // scrypt cost (2^14) — keep in sync with existing hashes

const scryptAsync = (password, salt) =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, { N }, (err, key) => (err ? reject(err) : resolve(key)));
  });

// Async on purpose: scryptSync blocks the Node event loop for ~40ms per call,
// so a burst of logins would freeze every other request (page renders included).
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = String(stored ?? "").split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== KEYLEN) return false;
  const actual = await scryptAsync(password, salt);
  return timingSafeEqual(expected, actual);
}
