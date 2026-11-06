import { exportReading, onReadingWrite, replaceReading } from "./db";
import {
  driveToken,
  explainDriveError,
  forgetDriveToken,
  isDriveConnected,
  lastSyncedAt,
  markDriveConnected,
  markDriveSignedOut,
  needsConsent,
  readDriveReading,
  writeDriveReading,
} from "./drive";
import { canonicalReading, mergeReading, normalizeReading } from "./mergeReading";

export type DrivePhase = "idle" | "working" | "ready" | "error";

export type DriveStatus = {
  phase: DrivePhase;
  message: string;
  syncedAt: number | null;
};

const listeners = new Set<(status: DriveStatus) => void>();
let status: DriveStatus = {
  phase: isDriveConnected() ? "ready" : "idle",
  message: "",
  syncedAt: lastSyncedAt(),
};
let timer = 0;
let running = false;
let again = false;

function publish(next: DriveStatus) {
  status = next;
  for (const listener of listeners) listener(status);
}

export function driveStatus() {
  return status;
}

export function subscribeDriveStatus(listener: (status: DriveStatus) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function signOutDrive() {
  markDriveSignedOut();
  publish({ phase: "idle", message: "Signed out on this browser. The Drive file is still there.", syncedAt: status.syncedAt });
}

async function pushReading(interactive: boolean) {
  const token = await driveToken(interactive);
  const remoteRaw = await readDriveReading(token);
  const remote = remoteRaw.file ? normalizeReading(remoteRaw.file) : null;
  const local = await exportReading();
  const merged = mergeReading(local, remote);
  const fileId = remoteRaw.id || (await readDriveReading(token)).id;
  if (!fileId) throw new Error("Google Drive did not return the reading file.");
  if (!remote || canonicalReading(merged) !== canonicalReading(remote)) {
    await writeDriveReading(token, fileId, merged);
  }
  if (canonicalReading(merged) !== canonicalReading(local)) await replaceReading(merged);
  const syncedAt = Date.now();
  markDriveConnected(syncedAt);
  publish({ phase: "ready", message: "Saved to My Drive / Ramayanam / reading.json.", syncedAt });
}

export async function syncDrive(interactive: boolean) {
  if (running) {
    again = true;
    return;
  }
  running = true;
  publish({ phase: "working", message: "Syncing with Google Drive…", syncedAt: status.syncedAt });
  try {
    await pushReading(interactive);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("401") || message.toLowerCase().includes("invalid authentication")) forgetDriveToken();
    publish({ phase: "error", message: explainDriveError(error), syncedAt: status.syncedAt });
    throw error;
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleDriveSync();
    }
  }
}

export async function syncNow() {
  try {
    await syncDrive(false);
  } catch (error) {
    if (!needsConsent(error) && !explainDriveError(error).startsWith("Sign in again")) throw error;
    await syncDrive(true);
  }
}

export function scheduleDriveSync() {
  if (!isDriveConnected()) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void syncDrive(false).catch(() => {
      // The Saved page shows the stored status.
    });
  }, 4000);
}

export function resumeDriveSync() {
  if (!isDriveConnected()) return;
  void syncDrive(false).catch((error) => {
    const message = explainDriveError(error);
    if (message.includes("blocked") || message.includes("closed") || message.startsWith("Sign in again")) {
      publish({ phase: "error", message: "Sign in again to sync this browser.", syncedAt: status.syncedAt });
    }
  });
}

onReadingWrite(() => scheduleDriveSync());
