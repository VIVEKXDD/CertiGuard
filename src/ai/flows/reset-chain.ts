
'use server';

/**
 * @fileOverview A flow for resetting the certificate hash chain to its genesis state.
 * This is an admin function for demonstration and system initialization.
 *
 * - resetChainFlow - A function to initiate the chain reset.
 */

import { resetChain } from '@/lib/firestore-db';

/**
 * Resets the certificate hash chain.
 * @returns A promise that resolves to a message indicating the result of the reset.
 */
export async function resetChainFlow(): Promise<{ message: string }> {
  console.log('Resetting the certificate chain to its genesis state...');
  const result = await resetChain();
  console.log(result.message);
  return result;
}
