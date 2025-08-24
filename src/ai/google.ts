/**
 * @fileoverview Configures Google authentication for server-side API calls.
 * This is used by Genkit flows to authorize requests to Google APIs like Google Drive.
 */
import { GoogleAuth } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';

let auth: GoogleAuth | undefined;
let drive: drive_v3.Drive | undefined;

/**
 * Provides a singleton instance of GoogleAuth, initialized with necessary scopes.
 * @returns A GoogleAuth instance.
 */
function getAuth() {
  if (!auth) {
    auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  }
  return auth;
}

/**
 * Provides a singleton instance of the Google Drive API client.
 * @returns An initialized Google Drive v3 client.
 */
export function getDrive() {
  if (!drive) {
    drive = google.drive({ version: 'v3', auth: getAuth() });
  }
  return drive;
}
