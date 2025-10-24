
'use server';

/**
 * @fileOverview A flow for managing certificate records in the mock database.
 * This simulates an admin function to add new, valid certificates to the registry.
 *
 * - addCertificateRecord - A function to add a new certificate.
 */

import { addCertificate } from '@/lib/firestore-db';
import type { AddCertificateRecordInput } from '@/lib/types';
import type { CertificateRecord } from '@/lib/firestore-db';


/**
 * Adds a new certificate record to the mock database.
 * This function is the single source of truth for hash generation.
 * @param input The certificate details to add.
 * @returns A promise that resolves with the newly created record, including the authoritative hash.
 */
export async function addCertificateRecord(input: AddCertificateRecordInput): Promise<CertificateRecord> {
  const newRecord = await addCertificate({
    id: input.certificateId,
    studentName: input.studentName,
    course: input.course,
    issuingInstitution: input.issuingInstitution,
    grade: input.grade,
    rollNumber: input.rollNumber,
    year: input.year,
  });
  console.log(`Certificate record added with authoritative hash: ${newRecord.hash}`);
  return newRecord;
}
