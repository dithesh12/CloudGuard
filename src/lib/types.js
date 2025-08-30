
import { z } from 'zod';

export const UIRoleSchema = z.enum(['Viewer', 'Commenter', 'Editor']);

export const PermissionSchema = z.object({
  email: z.string().email(),
  role: UIRoleSchema,
});

export const SetAccessRuleInputSchema = z.object({
  fileId: z.string().describe("The ID of the Google Drive file."),
  ownerId: z.string().describe("The Firebase UID of the user setting the rule."),
  allowedUsers: z.array(z.string().email()).describe("List of emails allowed to access the file."),
  viewLimit: z.number().int().min(1).describe("How many times the file can be viewed."),
  expiryTimestamp: z.number().optional().describe("A JS timestamp (milliseconds) for when access expires."),
  idToken: z.string().describe("The Firebase Auth ID token for verification.")
});

export const SetAccessRuleOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const ValidateAccessInputSchema = z.object({
  fileId: z.string().describe("The ID of the file being accessed."),
  userEmail: z.string().email().describe("The email of the user trying to access the file."),
  idToken: z.string().describe("The Firebase Auth ID token for verification."),
});

export const ValidateAccessOutputSchema = z.object({
  granted: z.boolean(),
  message: z.string(),
  viewLink: z.string().optional().describe("The direct Google Drive view link if access is granted."),
});
