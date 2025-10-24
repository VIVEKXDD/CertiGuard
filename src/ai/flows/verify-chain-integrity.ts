'use server';

/**
 * @fileOverview A flow for verifying the integrity of the certificate hash chain.
 * This is an admin function to detect tampering in the central registry.
 *
 * - verifyChain - A function to initiate the chain verification.
 */

import { verifyChainIntegrity } from '@/lib/firestore-db';

/**
 * Verifies the integrity of the certificate hash chain.
 * @returns A promise that resolves to an object containing the validity status and a log.
 */
export async function verifyChain(): Promise<{ isValid: boolean; log: string[] }> {
  console.log('Verifying certificate chain integrity...');
  const result = await verifyChainIntegrity();
  console.log(`Chain is valid: ${result.isValid}`);
  return result;
}
