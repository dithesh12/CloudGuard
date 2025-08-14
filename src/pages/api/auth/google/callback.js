import { oAuth2Client } from "@/lib/googleAuth";

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: "Missing code parameter" });
  }
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    // Set tokens in a cookie (httpOnly for security)
    res.setHeader(
      "Set-Cookie",
      `google_tokens=${encodeURIComponent(JSON.stringify(tokens))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );
    // Redirect to dashboard or home
    res.redirect("/dashboard");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
