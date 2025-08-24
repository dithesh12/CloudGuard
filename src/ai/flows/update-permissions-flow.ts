'use server';
/**
 * @fileOverview A Genkit flow for updating permissions on a Google Drive file.
 *
 * - updatePermissions - A function that manages file permissions.
 * - UpdatePermissionsInput - The input type for the updatePermissions function.
 * - UpdatePermissionsOutput - The return type for the updatePermissions function.
 */

import { ai } from '@/ai/genkit';
import { getDrive } from '@/ai/google';
import { z } from 'genkit/zod';
import {
  GoogleAuth,
} from 'google-auth-library';

const PermissionSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'organizer', 'fileOrganizer', 'writer', 'commenter', 'viewer']),
});

export const UpdatePermissionsInputSchema = z.object({
  fileId: z.string().describe('The ID of the Google Drive file to update.'),
  permissions: z.array(PermissionSchema).describe('The list of permissions to apply.'),
  expirationDate: z.string().optional().describe('An ISO 8601 date string for when the permissions should expire.'),
  idToken: z.string().describe('The Firebase Auth ID token of the user making the request.'),
});
export type UpdatePermissionsInput = z.infer<typeof UpdatePermissionsInputSchema>;

export const UpdatePermissionsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type UpdatePermissionsOutput = z.infer<typeof UpdatePermissionsOutputSchema>;

export async function updatePermissions(input: UpdatePermissionsInput): Promise<UpdatePermissionsOutput> {
  return updatePermissionsFlow(input);
}

const updatePermissionsFlow = ai.defineFlow(
  {
    name: 'updatePermissionsFlow',
    inputSchema: UpdatePermissionsInputSchema,
    outputSchema: UpdatePermissionsOutputSchema,
    auth: (auth, input) => {
        const authPolicy = async (auth, input) => {
            if (!input.idToken) {
                throw new Error("No idToken provided");
            }
            const auth = new GoogleAuth();
            const client = await auth.verifyIdToken({idToken: input.idToken});
            if (!client.getPayload()) {
                throw new Error("Invalid ID token");
            }
        };
        authPolicy(auth, input);
    }
  },
  async (input) => {
    const drive = getDrive();
    const { fileId, permissions, expirationDate } = input;

    try {
      // 1. Fetch existing permissions
      const { data: { permissions: existingPermissions } } = await drive.permissions.list({
        fileId,
        fields: 'permissions(id,emailAddress,role)',
      });

      const existingUserPermissions = existingPermissions.filter(p => p.role !== 'owner' && p.emailAddress);

      // 2. Determine permissions to add/update
      const permissionsToCreate = permissions.filter(p => 
        !existingUserPermissions.some(ep => ep.emailAddress === p.email && ep.role === p.role)
      );
      
      // 3. Determine permissions to remove
      const permissionsToRemove = existingUserPermissions.filter(ep => 
        !permissions.some(p => p.email === ep.emailAddress)
      );

      // Execute creation requests
      for (const p of permissionsToCreate) {
        await drive.permissions.create({
          fileId,
          requestBody: {
            role: p.role,
            type: 'user',
            emailAddress: p.email,
            expirationTime: expirationDate,
          },
          sendNotificationEmail: false, // Set to true to notify users
        });
      }

      // Execute deletion requests
      for (const p of permissionsToRemove) {
        if (p.id) {
          await drive.permissions.delete({
            fileId,
            permissionId: p.id,
          });
        }
      }
      
      // For simplicity, this example doesn't handle role *updates* for existing users,
      // but focuses on adding new users and removing those no longer in the list.
      // A full implementation would also compare roles and update them if they differ.

      return { success: true, message: 'Permissions updated successfully.' };
    } catch (error: any) {
      console.error('Google Drive API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to update permissions.');
    }
  }
);
