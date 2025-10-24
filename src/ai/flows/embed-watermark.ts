
'use server';

/**
 * @fileOverview A Genkit flow for embedding an invisible watermark into a certificate image.
 * This uses steganography to hide data within the image pixels.
 *
 * - embedWatermark - A function to embed a watermark into an image.
 */

import { z } from 'zod';
import Jimp from 'jimp';
import { ai } from '@/ai/genkit';
import { WatermarkEmbedInputSchema, WatermarkEmbedOutputSchema, type WatermarkEmbedInput, type WatermarkEmbedOutput } from '@/lib/types';


// Wrapper function for the flow
export async function embedWatermark(input: WatermarkEmbedInput): Promise<WatermarkEmbedOutput> {
  return embedWatermarkFlow(input);
}


const embedWatermarkFlow = ai.defineFlow(
  {
    name: 'embedWatermarkFlow',
    inputSchema: WatermarkEmbedInputSchema,
    outputSchema: WatermarkEmbedOutputSchema,
  },
  async ({ imageDataUri, watermarkText }) => {
    try {
      const imageBuffer = Buffer.from(imageDataUri.split(',')[1], 'base64');
      const image = await Jimp.read(imageBuffer);

      // Convert watermark text to binary
      let binaryWatermark = '';
      for (let i = 0; i < watermarkText.length; i++) {
        binaryWatermark += watermarkText[i].charCodeAt(0).toString(2).padStart(8, '0');
      }
      binaryWatermark += '00000011'; // End of Text character

      let watermarkIndex = 0;
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
        if (watermarkIndex < binaryWatermark.length) {
          const bit = parseInt(binaryWatermark[watermarkIndex], 2);
          // Modify the least significant bit of the red channel
          image.bitmap.data[idx] = (image.bitmap.data[idx] & 0xFE) | bit;
          watermarkIndex++;
        }
      });
      
      const watermarkedImageBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
      const watermarkedImageDataUri = `data:image/png;base64,${watermarkedImageBuffer.toString('base64')}`;
      
      return { watermarkedImageDataUri };

    } catch (error) {
      console.error('Error embedding watermark:', error);
      throw new Error('Failed to embed watermark into the image.');
    }
  }
);
