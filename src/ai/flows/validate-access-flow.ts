
'use server';
/**
 * @fileOverview A Genkit flow for validating file access based on Firestore rules.
 */
import { ai } from '@/ai/genkit';
import { ValidateAccessInputSchema, ValidateAccessOutputSchema } from '@/lib/types';
import type { z } from 'zod';
import { GoogleAuth } from 'google-auth-library';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
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

export async function validateAccess(input: z.infer<typeof ValidateAccessInputSchema>): Promise<z.infer<typeof ValidateAccessOutputSchema>> {
  return validateAccessFlow(input);
}

const validateAccessFlow = ai.defineFlow(
  {
    name: 'validateAccessFlow',
    inputSchema: ValidateAccessInputSchema,
    outputSchema: ValidateAccessOutputSchema,
     auth: (auth, input) => {
        const authPolicy = async (policyAuth: any, policyInput: any) => {
            if (!policyInput.idToken) {
                throw new Error("No idToken provided");
            }
            const googleAuth = new GoogleAuth();
            const client = await googleAuth.verifyIdToken({idToken: policyInput.idToken});
            const payload = client.getPayload();
             if (!payload || payload.email !== policyInput.userEmail) {
                throw new Error("Unauthorized: User email does not match token.");
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
      const { fileId, userEmail } = input;
      const docRef = db.collection('access_rules').doc(fileId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return { granted: false, message: 'Access rules not found for this file.' };
      }

      const accessRule = doc.data();
      if (!accessRule) {
        return { granted: false, message: 'Could not read access rules.' };
      }
      const currentTime = Date.now();

      // Check expiry
      if (accessRule.expiryTimestamp && currentTime > accessRule.expiryTimestamp) {
        return { granted: false, message: 'This secure link has expired.' };
      }

      // Check if user is authorized
      if (!accessRule.allowedUsers.includes(userEmail)) {
        return { granted: false, message: 'You are not authorized to view this file.' };
      }

      // Check view limits
      if (accessRule.viewsCount >= accessRule.viewLimit) {
        return { granted: false, message: 'The view limit for this link has been exceeded.' };
      }

      // Increment viewsCount atomically
      await docRef.update({ viewsCount: FieldValue.increment(1) });

      // Construct Google Drive viewer link
      const drive_view_link = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

      return {
        granted: true,
        message: 'Access granted.',
        viewLink: drive_view_link,
      };

    } catch (error: any) {
       console.error('Error validating access:', error);
       return { granted: false, message: error.message || 'An unexpected server error occurred.' };
    }
  }
);
