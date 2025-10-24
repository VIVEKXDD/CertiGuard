
'use server';

/**
 * @fileOverview Certificate authenticity verification flow.
  *
   * This flow provides a multi-factor verification process for academic certificates.
    * It validates a certificate by checking:
     * 1. A scannable QR code containing a digital signature.
      * 2. An invisible watermark embedded in the document, also containing the signature.
       * 3. The issuing institution and course against a predefined list.
        *
        * - verifyCertificateAuthenticity - A function that handles the certificate verification process.
         */

import { getCertificateById, isEntityBlacklisted, logVerificationAttempt } from '@/lib/firestore-db';
import {
  type VerifyCertificateAuthenticityInput,
  type VerifyCertificateAuthenticityOutput,
} from '@/lib/types';
import { extractWatermark } from './extract-watermark';

// Predefined static lists for validation
const VALID_INSTITUTIONS = ['IIT', 'NIT', 'IIIT', 'BITS', 'DTU'];
const VALID_COURSES = ['BTech CS', 'BTech DS', 'BTech AI', 'BTech EXTC', 'BTech Mech'];


/**
 * Verifies a certificate's authenticity using database checks, QR code signature, watermark signature,
 * and static lists for institution and course.
 * @param input The certificate data to verify.
 * @returns A promise that resolves to the verification result.
 */
export async function verifyCertificateAuthenticity(
  input: VerifyCertificateAuthenticityInput
): Promise<VerifyCertificateAuthenticityOutput> {
  let dbCheckResult = 'Not Performed';
  let signatureCheckResult = 'Not Performed';
  let watermarkCheckResult = 'Not Performed';
  let institutionCheckResult = 'Not Performed';
  let courseCheckResult = 'Not Performed';

  let status: 'Valid' | 'Partially Valid' | 'Invalid' = 'Invalid';
  let finalReason = 'Verification could not be completed.';
  let certificateId: string | null = null;
  
  try {
    // Step 1: Decode the input from the QR code
    let signatureFromQr: string | null = null;

    try {
        const decodedData = Buffer.from(input.qrDataUri.split(',')[1], 'base64').toString('utf-8');
        const qrData = JSON.parse(decodedData);
        certificateId = qrData.id;
        signatureFromQr = qrData.signature;
        if (!certificateId || !signatureFromQr) throw new Error("Missing ID or signature in QR data.");
    } catch (e) {
        finalReason = 'The provided document does not contain a valid, scannable QR code.';
        throw new Error(finalReason);
    }

    // Step 2: Central Registry Verification
    const record = await getCertificateById(certificateId);
    
    if (!record) {
        dbCheckResult = `Failed (No record found for ID: ${certificateId})`;
        finalReason = 'The certificate is invalid. It was not found in the central registry.';
        throw new Error(finalReason);
    }
    dbCheckResult = `Passed (Record found for ${record.studentName})`;

    // Step 2a: Blacklist Check (before any other validation)
    if (await isEntityBlacklisted(record.issuingInstitution)) {
        finalReason = `Verification failed: The issuing institution '${record.issuingInstitution}' has been blacklisted.`;
        throw new Error(finalReason);
    }


    // Step 3: Cryptographic Signature Validation (from QR code)
    const authoritativeHash = record.hash;
    const isQrSignatureValid = authoritativeHash === signatureFromQr;
    
    if (!isQrSignatureValid) {
        signatureCheckResult = 'Failed (QR signature mismatch - document may be altered)';
        finalReason = 'The certificate is invalid. The QR code signature does not match the official record.';
        throw new Error(finalReason);
    }
    signatureCheckResult = 'Passed (QR cryptographic signature is valid)';

    // Step 4 & 5: Institution and Course Validation
    const isInstitutionValid = VALID_INSTITUTIONS.some(inst => record.issuingInstitution.toLowerCase().includes(inst.toLowerCase()));
    institutionCheckResult = isInstitutionValid ? `Passed (${record.issuingInstitution})` : `Failed (Institution '${record.issuingInstitution}' is not on the approved list)`;
    
    const isCourseValid = VALID_COURSES.some(course => record.course.toLowerCase().includes(course.toLowerCase()));
    courseCheckResult = isCourseValid ? `Passed (${record.course})` : `Failed (Course '${record.course}' is not on the approved list)`;
    
    // Step 6: Invisible Watermark Validation
    if (input.documentDataUri) {
        const watermarkResult = await extractWatermark({ imageDataUri: input.documentDataUri });
        const signatureFromWatermark = watermarkResult.extractedWatermarkText;
        
        if (!signatureFromWatermark) {
            watermarkCheckResult = 'Failed (No watermark found in document)';
        } else if (signatureFromWatermark !== authoritativeHash) {
            watermarkCheckResult = 'Failed (Watermark signature mismatch - document may be a counterfeit)';
        } else {
            watermarkCheckResult = 'Passed (Watermark cryptographic signature is valid)';
        }
    } else {
        watermarkCheckResult = 'Not Performed (No document provided for watermark scan)';
    }

    // Final Status Determination
    const isCryptoValid = signatureCheckResult.startsWith('Passed') && watermarkCheckResult.startsWith('Passed');
    const areDetailsValid = isInstitutionValid && isCourseValid;

    if (isCryptoValid && areDetailsValid) {
        status = 'Valid';
        finalReason = 'The certificate is fully authentic. All cryptographic and content checks passed.';
    } else if (isCryptoValid && !areDetailsValid) {
        status = 'Partially Valid';
        let reasons = [];
        if (!isInstitutionValid) reasons.push("the issuing institution is not recognized");
        if (!isCourseValid) reasons.push("the course is not recognized");
        finalReason = `Cryptographic signatures are valid, but ${reasons.join(' and ')}.`;
    } else {
        status = 'Partially Valid';
        let reasons = [];
        if (watermarkCheckResult.startsWith('Failed')) reasons.push("the document's security watermark is invalid");
        if (!isInstitutionValid) reasons.push("the institution is unrecognized");
        if (!isCourseValid) reasons.push("the course is unrecognized");

        if (reasons.length > 0) {
           finalReason = `The QR code is valid, but ${reasons.join(', ')}.`;
        } else {
           finalReason = "The QR code is valid, but other security checks failed."
        }
    }


  } catch (error: any) {
    status = 'Invalid';
    finalReason = error.message || 'An unknown error occurred during verification.';
    // Ensure details are updated on failure
    if (dbCheckResult === 'Not Performed') dbCheckResult = 'Not Performed (Invalid QR)';
    if (signatureCheckResult === 'Not Performed') signatureCheckResult = 'Not Performed (Invalid QR)';
    if (watermarkCheckResult === 'Not Performed') watermarkCheckResult = 'Not Performed';
    if (institutionCheckResult === 'Not Performed') institutionCheckResult = 'Not Performed (Verification failed before this step)';
    if (courseCheckResult === 'Not Performed') courseCheckResult = 'Not Performed (Verification failed before this step)';
  }

  // Log every attempt
  await logVerificationAttempt({
      certificateId: certificateId || 'Unknown',
      status,
      reason: finalReason,
  });

  return {
      status,
      reason: finalReason,
      details: {
          dbCheck: dbCheckResult,
          signatureCheck: signatureCheckResult,
          watermarkCheck: watermarkCheckResult,
          institutionCheck: institutionCheckResult,
          courseCheck: courseCheckResult,
      },
  };
}
