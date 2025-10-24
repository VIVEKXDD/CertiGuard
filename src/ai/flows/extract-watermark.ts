
'use server';

/**
 * @fileOverview A Genkit flow for extracting an invisible watermark from an image.
 *
 * - extractWatermark - A function to extract a watermark from an image.
 */

import { z } from 'zod';
// @ts-ignore
import PNG from 'png-js';
import { ai } from '@/ai/genkit';
import { WatermarkExtractInputSchema, WatermarkExtractOutputSchema, type WatermarkExtractInput, type WatermarkExtractOutput } from '@/lib/types';

// Helper to decode a PNG buffer
function decodePng(buffer: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            const png = new PNG(buffer);
            png.decode(pixels => {
                if (!pixels) {
                   return reject(new Error("Failed to decode pixels from PNG."));
                }
                resolve({
                    width: png.width,
                    height: png.height,
                    data: pixels
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}


// Wrapper function for the flow
export async function extractWatermark(input: WatermarkExtractInput): Promise<WatermarkExtractOutput> {
  return extractWatermarkFlow(input);
}


const extractWatermarkFlow = ai.defineFlow(
  {
    name: 'extractWatermarkFlow',
    inputSchema: WatermarkExtractInputSchema,
    outputSchema: WatermarkExtractOutputSchema,
  },
  async ({ imageDataUri }) => {
    try {
      const imageBuffer = Buffer.from(imageDataUri.split(',')[1], 'base64');
      const decodedPng = await decodePng(imageBuffer);
      
      let binaryWatermark = '';
      const pixels = decodedPng.data;

      // Each pixel is 4 bytes (R, G, B, A)
      for (let i = 0; i < pixels.length; i += 4) {
        // Extract the least significant bit from the red channel
        const lsb = pixels[i] & 1;
        binaryWatermark += lsb;
      }
      
      let extractedText = '';
      for (let i = 0; i < binaryWatermark.length; i += 8) {
        const byte = binaryWatermark.substring(i, i + 8);
        if (byte.length === 8) {
            const charCode = parseInt(byte, 2);
            if (charCode === 3) { // End of Text character
                break;
            }
            extractedText += String.fromCharCode(charCode);
        }
      }

      return { extractedWatermarkText: extractedText || null };

    } catch (error) {
      console.error('Error extracting watermark:', error);
      // Return null if extraction fails for any reason (e.g., no watermark)
      return { extractedWatermarkText: null };
    }
  }
);
