
'use server';
/**
 * @fileOverview A Genkit flow for updating permissions on a Google Drive file.
 *
 * - updatePermissions - A function that manages file permissions.
 */

import { ai } from '@/ai/genkit';
import { getDrive } from '@/ai/google';
import { z } from 'zod';
import { GoogleAuth } from 'google-auth-library';


const UIRoleSchema = z.enum(['Viewer', 'Commenter', 'Editor']);

const PermissionSchema = z.object({
  email: z.string().email(),
  role: UIRoleSchema,
});

const UpdatePermissionsInputSchema = z.object({
  fileId: z.string().describe('The ID of the Google Drive file to update.'),
  permissions: z.array(PermissionSchema).describe('The list of permissions to apply.'),
  expirationDate: z.string().optional().describe('An ISO 8601 date string for when the permissions should expire.'),
  idToken: z.string().describe('The Firebase Auth ID token of the user making the request.'),
});

const UpdatePermissionsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

type UpdatePermissionsInput = z.infer<typeof UpdatePermissionsInputSchema>;
type UpdatePermissionsOutput = z.infer<typeof UpdatePermissionsOutputSchema>;

const roleMapping: Record<'Viewer' | 'Commenter' | 'Editor', 'viewer' | 'commenter' | 'writer'> = {
  'Viewer': 'viewer',
  'Commenter': 'commenter',
  'Editor': 'writer',
};

export async function updatePermissions(input: UpdatePermissionsInput): Promise<UpdatePermissionsOutput> {
  return updatePermissionsFlow(input);
}

const updatePermissionsFlow = ai.defineFlow(
  {
    name: 'updatePermissionsFlow',
    inputSchema: UpdatePermissionsInputSchema,
    outputSchema: UpdatePermissionsOutputSchema,
    auth: (auth, input) => {
        const authPolicy = async (policyAuth: any, policyInput: any) => {
            if (!policyInput.idToken) {
                throw new Error("No idToken provided");
            }
            const googleAuth = new GoogleAuth();
            const client = await googleAuth.verifyIdToken({idToken: policyInput.idToken});
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
      
      const desiredPermissions = permissions.map(p => ({ email: p.email, role: roleMapping[p.role] }));

      // 2. Determine permissions to add (new users)
      const permissionsToCreate = desiredPermissions.filter(dp => 
        !existingUserPermissions.some(ep => ep.emailAddress === dp.email)
      );

      // 3. Determine permissions to update (existing users with changed roles)
      const permissionsToUpdate = desiredPermissions.filter(dp => {
        const existingPerm = existingUserPermissions.find(ep => ep.emailAddress === dp.email);
        return existingPerm && existingPerm.role !== dp.role;
      });

      // 4. Determine permissions to remove (users no longer in the list)
      const permissionsToRemove = existingUserPermissions.filter(ep => 
        ep.emailAddress && !desiredPermissions.some(dp => dp.email === ep.emailAddress)
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
          sendNotificationEmail: false,
        });
      }

      // Execute update requests
      for (const p of permissionsToUpdate) {
         const existingPerm = existingUserPermissions.find(ep => ep.emailAddress === p.email);
         if (existingPerm?.id) {
            await drive.permissions.update({
                fileId,
                permissionId: existingPerm.id,
                requestBody: {
                    role: p.role,
                },
            });
         }
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

      return { success: true, message: 'Permissions updated successfully.' };
    } catch (error: any) {
      console.error('Google Drive API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to update permissions.');
    }
  }
);

