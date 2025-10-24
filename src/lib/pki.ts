/**
 * @fileOverview A utility for simulating PKI (Public Key Infrastructure) operations.
 * This includes creating and verifying digital signatures (hashes) for certificates.
 * This has been updated to use a canonical JSON string for hashing to ensure consistency.
 */

import { createHash } from 'crypto';

// This interface defines the core fields that constitute a certificate's unique identity.
// It deliberately omits blockchain-specific fields like `previousHash`.
interface CertificateSignatureData {
  id: string;
  studentName: string;
  course: string;
  issuingInstitution: string;
  grade: string;
  rollNumber: string;
  year: number;
}

/**
 * Calculates a SHA-256 hash of the core certificate data using a canonical method.
 * This is the single, authoritative function for creating a certificate's signature.
 * It ensures a consistent hash by sorting the object keys before stringifying.
 * @param data The core data of the certificate.
 * @returns A hex-encoded SHA-256 hash, representing the digital signature.
 */
export function calculateCertificateHash(data: Partial<CertificateSignatureData>): string {
  // Create a new object with only the required fields to ensure no extra data is included.
  const canonicalData: CertificateSignatureData = {
    id: data.id || '',
    studentName: data.studentName || '',
    course: data.course || '',
    issuingInstitution: data.issuingInstitution || '',
    grade: data.grade || '',
    rollNumber: data.rollNumber || '',
    year: Number(data.year) || 0,
  };

  // Sort keys alphabetically to create a canonical representation.
  const orderedData: { [key: string]: any } = {};
  Object.keys(canonicalData).sort().forEach(key => {
    orderedData[key] = canonicalData[key as keyof CertificateSignatureData];
  });
  
  // Stringify the ordered object to get a consistent data string.
  const dataString = JSON.stringify(orderedData);
  
  // Return the SHA-256 hash of the canonical string.
  return createHash('sha256').update(dataString).digest('hex');
}
