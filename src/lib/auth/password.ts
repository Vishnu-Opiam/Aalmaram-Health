import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Constant-ish time failure path for unknown accounts. Comparing against a
 * throwaway hash keeps the response time of "no such user" close to that of
 * "wrong password", so the login endpoint does not enumerate accounts.
 */
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7Vv1sFRVn/nZ3xEy1BxV8yQ4dO6nY9K";

export async function verifyPasswordSafely(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(plain, hash);
}
