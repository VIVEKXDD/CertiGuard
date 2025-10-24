import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-cert-details.ts';
import '@/ai/flows/verify-certificate-authenticity.ts';
import '@/ai/flows/manage-certificate-records.ts';
import '@/ai/flows/verify-chain-integrity.ts';
import '@/ai/flows/tamper-chain.ts';
import '@/ai/flows/reset-chain.ts';
import '@/ai/flows/authenticate-user.ts';
import '@/ai/flows/embed-watermark.ts';
import '@/ai/flows/extract-watermark.ts';
