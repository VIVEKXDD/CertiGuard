
'use server';

/**
 * @fileOverview Certificate detail suggestion flow using Genkit and Gemini.
 *
 * This file defines a flow that uses the Gemini multimodal model to extract
 * certificate details from an uploaded document. It sends the image to the
 * model and requests structured output for key information.
 *
 * @exports suggestCertDetails - A function that initiates the certificate detail suggestion flow.
 */
import { ai } from '@/ai/genkit';
import {
  SuggestCertDetailsInputSchema,
  SuggestCertDetailsOutputSchema,
  type SuggestCertDetailsInput,
  type SuggestCertDetailsOutput
} from '@/lib/types';

/**
 * Extracts certificate details from a document image using the Gemini model.
 * @param input - The input containing the document image as a data URI.
 * @returns A promise that resolves with the extracted certificate details.
 */
export async function suggestCertDetails(input: SuggestCertDetailsInput): Promise<SuggestCertDetailsOutput> {
  return suggestCertDetailsFlow(input);
}


const suggestCertDetailsPrompt = ai.definePrompt({
    name: 'suggestCertDetailsPrompt',
    input: { schema: SuggestCertDetailsInputSchema },
    output: { schema: SuggestCertDetailsOutputSchema },
    prompt: `You are an expert at analyzing academic certificates. 
    
    Analyze the provided certificate image and extract the following information. 
    If a specific detail is not present, return an empty string for that field.

    - The full name of the student.
    - The name of the course or degree completed.
    - The name of the issuing institution.
    - The unique certificate ID or number.
    - The final grade, marks, or percentage achieved.
    - The student's roll number or student ID.
    - The year of completion or issuance.

    Document: {{media url=documentDataUri}}
    `,
});

const suggestCertDetailsFlow = ai.defineFlow(
  {
    name: 'suggestCertDetailsFlow',
    inputSchema: SuggestCertDetailsInputSchema,
    outputSchema: SuggestCertDetailsOutputSchema,
  },
  async (input) => {
    try {
        const { output } = await suggestCertDetailsPrompt(input);
        if (!output) {
            throw new Error('The AI model did not return any output.');
        }
        return output;
    } catch (error) {
        console.error("Gemini processing failed:", error);
        throw new Error("Failed to extract text from the document using Gemini.");
    }
  }
);
