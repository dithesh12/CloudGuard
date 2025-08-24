
import { z } from 'zod';

export const UIRoleSchema = z.enum(['Viewer', 'Commenter', 'Editor']);

export const PermissionSchema = z.object({
  email: z.string().email(),
  role: UIRoleSchema,
});

export const UpdatePermissionsInputSchema = z.object({
  fileId: z.string().describe('The ID of the Google Drive file to update.'),
  permissions: z.array(PermissionSchema).describe('The list of permissions to apply.'),
  expirationDate: z.string().optional().describe('An ISO 8601 date string for when the permissions should expire.'),
  idToken: z.string().describe('The Firebase Auth ID token of the user making the request.'),
});

export const UpdatePermissionsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
