/**
 * @fileOverview A mock user database for demonstration purposes.
 * In a real application, this data would come from a secure database.
 */
import type { Role } from './types';

export interface MockUser {
  email: string;
  role: Role;
  password: string; // Plaintext for demo purposes ONLY. Never do this in production.
}

const users: MockUser[] = [
  {
    email: 'admin@certguard.com',
    role: 'Admin',
    password: 'password123',
  },
  {
    email: 'mit@edu',
    role: 'Institution',
    password: 'password123',
  },
    {
    email: 'verifier@google.com',
    role: 'Verifier',
    password: 'password123',
  },
];

/**
 * Finds a user by their email address.
 * @param email The email to search for.
 * @returns A promise that resolves with the user object or null if not found.
 */
export async function getUserByEmail(email: string): Promise<MockUser | null> {
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  return user || null;
}
