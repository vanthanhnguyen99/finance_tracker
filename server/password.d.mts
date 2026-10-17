export class PasswordBusyError extends Error {}
export function hashPassword(password: string): Promise<string>;
export function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean>;
