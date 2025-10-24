
import { z } from 'zod';

export type Role = 'Admin' | 'Institution' | 'Verifier';

export type User = {
  email: string;
  role: Role;
};

// Schema for the certificate verification input
export const VerifyCertificateAuthenticityInputSchema = z.object({
  qrDataUri: z
    .string()
    .describe(
      "The QR code data as a data URI."
    ),
  documentDataUri: z
    .string()
    .describe("A certificate document (image) as a data URI for watermark extraction.")
    .nullable(),
});
export type VerifyCertificateAuthenticityInput = z.infer<typeof VerifyCertificateAuthenticityInputSchema>;

// Schema for the certificate verification output
export const VerifyCertificateAuthenticityOutputSchema = z.object({
  status: z.enum(['Valid', 'Partially Valid', 'Invalid']).describe('The overall verification status.'),
  reason: z.string().describe('A detailed explanation of the verification result.'),
  details: z.object({
    dbCheck: z.string().describe('Result of the database cross-check.'),
    signatureCheck: z.string().describe('Result of the QR code digital signature validation.'),
    watermarkCheck: z.string().describe('Result of the invisible watermark validation.'),
    institutionCheck: z.string().describe('Result of the institution validation.'),
    courseCheck: z.string().describe('Result of the course validation.'),
  }),
});
export type VerifyCertificateAuthenticityOutput = z.infer<typeof VerifyCertificateAuthenticityOutputSchema>;

// Schema for adding a new certificate record
export const AddCertificateRecordInputSchema = z.object({
  certificateId: z.string(),
  studentName: z.string(),
  course: z.string(),
  issuingInstitution: z.string(),
  grade: z.string(),
  rollNumber: z.string(),
  year: z.number(),
});
export type AddCertificateRecordInput = z.infer<typeof AddCertificateRecordInputSchema>;

// Schema for user authentication
export const AuthenticateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z.custom<Role>(),
});
export type AuthenticateUserInput = z.infer<typeof AuthenticateUserInputSchema>;

export const AuthenticateUserOutputSchema = z.object({
  success: z.boolean(),
  user: z.object({
    email: z.string(),
    role: z.custom<Role>(),
  }).nullable(),
  message: z.string(),
});
export type AuthenticateUserOutput = z.infer<typeof AuthenticateUserOutputSchema>;

// Schema for suggesting certificate details
export const SuggestCertDetailsInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "The certificate document as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SuggestCertDetailsInput = z.infer<typeof SuggestCertDetailsInputSchema>;

export const SuggestCertDetailsOutputSchema = z.object({
  suggestedName: z.string().describe("The suggested student's full name from the document."),
  course: z.string().describe('The course or degree name.'),
  issuingInstitution: z.string().describe('The name of the issuing institution.'),
  suggestedId: z.string().describe('The suggested unique certificate number from the document.'),
  grade: z.string().describe('The final grade or percentage obtained.'),
  rollNumber: z.string().describe("The student's roll number or ID."),
  year: z.number().describe('The year of completion or issuance.'),
});
export type SuggestCertDetailsOutput = z.infer<typeof SuggestCertDetailsOutputSchema>;


// Schema for embedding a watermark
export const WatermarkEmbedInputSchema = z.object({
  imageDataUri: z.string().describe('The certificate image as a data URI.'),
  watermarkText: z.string().describe('The text to embed as a watermark.'),
});
export type WatermarkEmbedInput = z.infer<typeof WatermarkEmbedInputSchema>;

export const WatermarkEmbedOutputSchema = z.object({
  watermarkedImageDataUri: z.string().describe('The image with the embedded watermark as a data URI.'),
});
export type WatermarkEmbedOutput = z.infer<typeof WatermarkEmbedOutputSchema>;

// Schema for extracting a watermark
export const WatermarkExtractInputSchema = z.object({
  imageDataUri: z.string().describe('The image to extract the watermark from as a data URI.'),
});
export type WatermarkExtractInput = z.infer<typeof WatermarkExtractInputSchema>;

export const WatermarkExtractOutputSchema = z.object({
  extractedWatermarkText: z.string().nullable().describe('The extracted watermark text, or null if not found.'),
});
export type WatermarkExtractOutput = z.infer<typeof WatermarkExtractOutputSchema>;
