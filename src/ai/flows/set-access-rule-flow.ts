
'use server';
/**
 * @fileOverview A Genkit flow for setting access rules in Firestore.
 */
import { ai } from '@/ai/genkit';
import { SetAccessRuleInputSchema, SetAccessRuleOutputSchema } from '@/lib/types';
import type { z } from 'zod';
import { GoogleAuth } from 'google-auth-library';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  // In a real production environment, you would use environment variables
  // or a secret manager instead of bundling the key.
  // For this example, we assume 'serviceAccountKey.json' is in the root directory.
  try {
    const serviceAccount = require('../../../serviceAccountKey.json');
    initializeApp({
      credential: cert(serviceAccount)
    });
  } catch (e) {
    console.error("serviceAccountKey.json not found. Firestore features will not work.", e);
  }
}

const db = getFirestore();

export async function setAccessRule(input: z.infer<typeof SetAccessRuleInputSchema>): Promise<z.infer<typeof SetAccessRuleOutputSchema>> {
  return setAccessRuleFlow(input);
}

const setAccessRuleFlow = ai.defineFlow(
  {
    name: 'setAccessRuleFlow',
    inputSchema: SetAccessRuleInputSchema,
    outputSchema: SetAccessRuleOutputSchema,
    auth: (auth, input) => {
        const authPolicy = async (policyAuth: any, policyInput: any) => {
            if (!policyInput.idToken) {
                throw new Error("No idToken provided");
            }
            const googleAuth = new GoogleAuth();
            const client = await googleAuth.verifyIdToken({idToken: policyInput.idToken});
            const payload = client.getPayload();
            if (!payload || payload.uid !== policyInput.ownerId) {
                throw new Error("Unauthorized: Invalid ID token or owner mismatch.");
            }
        };
        authPolicy(auth, input);
    }
  },
  async (input) => {
    try {
      if (!db) {
         throw new Error("Firestore is not initialized. Please check server configuration.");
      }
      const { fileId, ownerId, allowedUsers, viewLimit, expiryTimestamp } = input;

      const accessRule = {
        fileId,
        ownerId,
        allowedUsers,
        viewLimit,
        viewsCount: 0,
        // Firestore timestamps work well with milliseconds
        expiryTimestamp: expiryTimestamp || null,
      };

      await db.collection('access_rules').doc(fileId).set(accessRule);

      return { success: true, message: 'Access rules saved successfully' };
    } catch (error: any) {
      console.error('Error setting access rule:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }
);
