import React, { useState } from "react";

export default function DriveDemo() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Start Google OAuth flow
  const handleLogin = () => {
    window.location.href = "/api/auth/google"; // This should redirect to your backend OAuth endpoint
  };

  // Step 2: Fetch files from your backend after authentication
  const fetchFiles = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/drive/files"); // You need to implement this API route
      if (!res.ok) throw new Error("Failed to fetch files");
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
      <h3>Google Drive Demo</h3>
      <button onClick={handleLogin} style={{ marginRight: 8 }}>
        Login with Google
      </button>
      <button onClick={fetchFiles} disabled={loading}>
        {loading ? "Loading..." : "Fetch My Drive Files"}
      </button>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
              {file.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
