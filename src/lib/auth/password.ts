import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Minimum bar for a password. Returns null when acceptable. */
export function passwordProblem(plain: string): string | null {
  if (plain.length < 10) return "Use at least 10 characters.";
  if (!/[a-z]/.test(plain) || !/[A-Z]/.test(plain)) return "Mix upper and lower case.";
  if (!/[0-9]/.test(plain)) return "Include at least one number.";
  return null;
}
