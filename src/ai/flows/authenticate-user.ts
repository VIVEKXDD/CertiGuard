
'use server';

/**
 * @fileOverview A backend flow for user authentication.
 * This simulates a secure, server-side login process.
 *
 * - authenticateUser - A function to verify user credentials.
 */

import { getUserByEmail } from '@/lib/users';
import type { AuthenticateUserInput, AuthenticateUserOutput } from '@/lib/types';


/**
 * Authenticates a user based on email, password, and role.
 * In a real application, you would use a secure method like Firebase Auth.
 * For this demo, we check against a predefined list and a static password.
 * @param input The user's login credentials.
 * @returns A promise that resolves with the authentication result.
 */
export async function authenticateUser(
  input: AuthenticateUserInput
): Promise<AuthenticateUserOutput> {
  const user = await getUserByEmail(input.email);

  if (!user) {
    return { success: false, user: null, message: 'Invalid email or password.' };
  }

  // This is a simplified check. A real app should use hashed passwords.
  if (user.password !== input.password) {
    return { success: false, user: null, message: 'Invalid email or password.' };
  }

  // Optional: Check if the role matches
  if (user.role !== input.role) {
      return { success: false, user: null, message: `User is not registered as a(n) ${input.role}.`};
  }

  return {
    success: true,
    user: { email: user.email, role: user.role },
    message: 'Login successful.',
  };
}
