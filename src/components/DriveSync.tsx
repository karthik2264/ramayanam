import { useEffect, useState, type FormEvent } from "react";
import { DRIVE_FILE_PATH, clientIdFromBuild, googleClientId, isDriveConnected, saveGoogleClientId } from "../lib/drive";
import {
  driveStatus,
  signOutDrive,
  subscribeDriveStatus,
  syncDrive,
  syncNow,
  type DriveStatus,
} from "../lib/driveSync";

function formatWhen(value: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export function DriveSync() {
  const [clientId, setClientId] = useState(googleClientId);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<DriveStatus>(driveStatus);
  const [notice, setNotice] = useState("");
  const connected = isDriveConnected();

  useEffect(() => subscribeDriveStatus(setStatus), []);

  async function connect() {
    setNotice("");
    try {
      if (isDriveConnected()) await syncNow();
      else await syncDrive(true);
    } catch {
      // Status already explains the failure.
    }
  }

  function saveId(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    try {
      saveGoogleClientId(draft);
      setClientId(googleClientId());
      setDraft("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That client ID was not saved.");
    }
  }

  return (
    <section className="drive" aria-label="Google Drive">
      <h2>Google Drive</h2>
      <p className="quiet">
        Bookmarks and the last reading place are stored at {DRIVE_FILE_PATH}. Localhost, a CloudFront address, and a
        custom domain share that file when they use the same Google client.
      </p>
      {clientId ? (
        <div className="drive-actions">
          <button type="button" className="text-button install-go" onClick={() => void connect()} disabled={status.phase === "working"}>
            {connected ? "Sync now" : "Sign in with Google"}
          </button>
          {connected ? (
            <button type="button" className="text-button" onClick={signOutDrive} disabled={status.phase === "working"}>
              Sign out
            </button>
          ) : null}
        </div>
      ) : (
        <form className="drive-form" onSubmit={saveId}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="000000000000-abc.apps.googleusercontent.com"
            aria-label="Google OAuth client ID"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="text-button install-go">
            Save client ID
          </button>
        </form>
      )}
      {clientId && !clientIdFromBuild() ? (
        <p className="quiet">This browser is using a client ID saved on this site. The hosted site needs the same ID.</p>
      ) : null}
      {!clientId ? (
        <p className="quiet">
          Put the client ID in <code>VITE_GOOGLE_CLIENT_ID</code> before you build, or paste it here. Google accepts
          https origins, and http://localhost.
        </p>
      ) : null}
      {status.message ? <p className={status.phase === "error" ? "error" : "quiet"}>{status.message}</p> : null}
      {status.syncedAt ? <p className="quiet">Last synced {formatWhen(status.syncedAt)}.</p> : null}
      {notice ? <p className="error">{notice}</p> : null}
    </section>
  );
}
