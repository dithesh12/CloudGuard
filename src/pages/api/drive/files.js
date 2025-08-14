import { google } from "googleapis";
import { oAuth2Client } from "@/lib/googleAuth";

export default async function handler(req, res) {
  const userTokens = req.cookies['google_tokens'] ? JSON.parse(req.cookies['google_tokens']) : null;

  if (!userTokens) {
    return res.status(401).json({ error: "User not authenticated with Google." });
  }

  oAuth2Client.setCredentials(userTokens);
  const drive = google.drive({ version: "v3", auth: oAuth2Client });

  try {
    const response = await drive.files.list({
      pageSize: 10,
      fields: "files(id, name, webViewLink)",
    });
    res.status(200).json({ files: response.data.files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
