import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { isDriveConnected } from "../lib/drive";
import { driveStatus, subscribeDriveStatus, syncNow, type DriveStatus } from "../lib/driveSync";

/**
 * Google only hands out a new access token from a click, so after a reload or once the
 * hourly token runs out, sync pauses. This banner gives the reader that click on any page.
 */
export function SyncBanner() {
  const [status, setStatus] = useState<DriveStatus>(driveStatus);
  const [dismissed, setDismissed] = useState(false);
  const { pathname } = useLocation();

  useEffect(
    () =>
      subscribeDriveStatus((next) => {
        setStatus(next);
        if (next.phase === "ready") setDismissed(false);
      }),
    [],
  );

  // The Saved page already shows the Drive status with its own button.
  if (!status.needsTap || dismissed || pathname === "/saved" || !isDriveConnected()) return null;

  async function resume() {
    try {
      await syncNow();
    } catch {
      // The status update explains what went wrong.
    }
  }

  return (
    <aside className="install-hint sync-banner" aria-label="Google Drive sync" role="status">
      <p>Google Drive sync is paused. Your reading is saved in this browser and will sync when you continue.</p>
      <div className="install-actions">
        <button
          type="button"
          className="text-button install-go"
          onClick={() => void resume()}
          disabled={status.phase === "working"}
        >
          {status.phase === "working" ? "Syncing…" : "Resume sync"}
        </button>
        <button type="button" className="text-button" onClick={() => setDismissed(true)}>
          Not now
        </button>
      </div>
    </aside>
  );
}
