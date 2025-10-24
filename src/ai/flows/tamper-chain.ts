
'use server';

/**
 * @fileOverview A flow for simulating a tampering event in the certificate hash chain.
 * This is an admin/developer function to demonstrate the chain's integrity verification.
 *
 * - tamperChain - A function to initiate the tampering simulation.
 */

import { tamperWithChain } from '@/lib/firestore-db';

/**
 * Simulates tampering with the certificate hash chain.
 * @returns A promise that resolves to a message indicating the result of the tampering.
 */
export async function tamperChain(): Promise<{ message: string }> {
  console.log('Simulating tampering with the certificate chain...');
  const result = await tamperWithChain();
  console.log(result.message);
  return result;
}
