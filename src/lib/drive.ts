import type { ReadingFile } from "./types";

export const DRIVE_FILE_PATH = "My Drive / Ramayanam / reading.json";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const CLIENT_KEY = "ramayanam.googleClientId";
const CONNECTED_KEY = "ramayanam.drive.connected";
const SYNCED_KEY = "ramayanam.drive.syncedAt";
const FOLDER_NAME = "Ramayanam";
const FILE_NAME = "reading.json";
const APP_KEY = "ramayanam";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type TokenClient = {
  requestAccessToken: (override?: { prompt?: "" | "consent" }) => void;
};

type GoogleOauth = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }) => TokenClient;
  revoke: (token: string, done?: () => void) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOauth } };
  }
}

type DriveFile = { id: string; name?: string };

let gisPromise: Promise<void> | null = null;
let tokenClient: TokenClient | null = null;
let clientFor = "";
let pending: ((response: TokenResponse) => void) | null = null;
let pendingError: ((message: string) => void) | null = null;
let accessToken = "";
let expiresAt = 0;

export function googleClientId() {
  const fromEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
  if (fromEnv) return fromEnv;
  try {
    return localStorage.getItem(CLIENT_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function clientIdFromBuild() {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
}

export function saveGoogleClientId(value: string) {
  const id = value.trim();
  if (!id.endsWith(".apps.googleusercontent.com") || id.length < 30) {
    throw new Error("That is not a Google OAuth client ID. It ends with .apps.googleusercontent.com.");
  }
  localStorage.setItem(CLIENT_KEY, id);
  accessToken = "";
  expiresAt = 0;
  tokenClient = null;
  clientFor = "";
}

export function isDriveConnected() {
  try {
    return localStorage.getItem(CONNECTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function lastSyncedAt() {
  const raw = Number(localStorage.getItem(SYNCED_KEY) || 0);
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

export function markDriveConnected(when = Date.now()) {
  localStorage.setItem(CONNECTED_KEY, "1");
  localStorage.setItem(SYNCED_KEY, String(when));
}

export function markDriveSignedOut() {
  localStorage.removeItem(CONNECTED_KEY);
  const token = accessToken;
  accessToken = "";
  expiresAt = 0;
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token);
}

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisPromise = null;
        reject(new Error("Google sign-in did not load. Check the network connection."));
      };
      document.head.appendChild(script);
    });
  }
  return gisPromise;
}

async function client(clientId: string) {
  await loadGis();
  const oauth = window.google?.accounts?.oauth2;
  if (!oauth) throw new Error("Google sign-in did not load. Check the network connection.");
  if (tokenClient && clientFor === clientId) return tokenClient;
  clientFor = clientId;
  tokenClient = oauth.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: (response) => {
      const resolve = pending;
      pending = null;
      pendingError = null;
      resolve?.(response);
    },
    error_callback: (error) => {
      const reject = pendingError;
      pending = null;
      pendingError = null;
      reject?.(error.message || error.type || "Google sign-in did not finish");
    },
  });
  return tokenClient;
}

export function forgetDriveToken() {
  accessToken = "";
  expiresAt = 0;
}

async function requestToken(clientId: string, prompt: "" | "consent") {
  const current = await client(clientId);
  return new Promise<string>((resolve, reject) => {
    pending = (response) => {
      if (response.error || !response.access_token) {
        reject(new Error(response.error_description || response.error || "Google sign-in did not finish"));
        return;
      }
      accessToken = response.access_token;
      expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
      resolve(response.access_token);
    };
    pendingError = reject;
    current.requestAccessToken({ prompt });
  });
}

export async function driveToken(interactive: boolean) {
  const clientId = googleClientId();
  if (!clientId) throw new Error("Add the Google client ID before signing in.");
  if (!interactive && accessToken && Date.now() < expiresAt - 60_000) return accessToken;
  return requestToken(clientId, interactive ? "consent" : "");
}

async function driveJson<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function appQuery(extra: string) {
  return `${extra} and appProperties has { key = 'app' and value = '${APP_KEY}' } and trashed = false`;
}

async function findOne(token: string, query: string) {
  const params = new URLSearchParams({
    q: query,
    spaces: "drive",
    pageSize: "5",
    fields: "files(id,name)",
  });
  const listed = await driveJson<{ files?: DriveFile[] }>(
    token,
    `https://www.googleapis.com/drive/v3/files?${params}`,
  );
  return listed.files?.[0] ?? null;
}

async function ensureFolder(token: string) {
  const existing = await findOne(
    token,
    appQuery(`name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder'`),
  );
  if (existing) return existing.id;
  const created = await driveJson<DriveFile>(token, "https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
      appProperties: { app: APP_KEY },
    }),
  });
  return created.id;
}

async function ensureFile(token: string) {
  const existing = await findOne(
    token,
    appQuery(`name = '${FILE_NAME}' and mimeType = 'application/json'`),
  );
  if (existing) return existing.id;
  const parents = [await ensureFolder(token)];
  const boundary = `ramayanam_${Date.now()}`;
  const metadata = {
    name: FILE_NAME,
    mimeType: "application/json",
    parents,
    appProperties: { app: APP_KEY, kind: "reading" },
  };
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify({ version: 1, bookmarks: [], progress: [], removedBookmarks: [] }),
    `--${boundary}--`,
    "",
  ].join("\r\n");
  const created = await driveJson<DriveFile>(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  return created.id;
}

export async function readDriveReading(token: string): Promise<{ id: string; file: ReadingFile | null }> {
  const id = await ensureFile(token);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return { id: "", file: null };
  if (!response.ok) throw new Error(await response.text());
  const text = (await response.text()).trim();
  if (!text) return { id, file: null };
  try {
    return { id, file: JSON.parse(text) as ReadingFile };
  } catch {
    throw new Error("The Drive file is not valid JSON.");
  }
}

export async function writeDriveReading(token: string, id: string, file: ReadingFile) {
  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(file),
    },
  );
  if (!response.ok) throw new Error(await response.text());
}

export function explainDriveError(error: unknown) {
  const message = error instanceof Error ? error.message : "Drive sync failed";
  const lower = message.toLowerCase();
  if (
    lower.includes("interaction_required") ||
    lower.includes("consent_required") ||
    lower.includes("login_required")
  ) {
    return "Sign in again to sync this browser.";
  }
  if (lower.includes("popup_closed") || lower.includes("access_denied")) {
    return "Google sign-in was closed before it finished.";
  }
  if (lower.includes("popup_failed_to_open")) {
    return "The browser blocked the Google sign-in window.";
  }
  if (
    lower.includes("origin") ||
    lower.includes("not a valid origin") ||
    lower.includes("idpiframe_initialization_failed")
  ) {
    return "This website is not listed on the Google client. Add this exact origin under Authorized JavaScript origins.";
  }
  if (lower.includes("accessnotconfigured") || lower.includes("drive api has not been used")) {
    return "Turn on the Google Drive API for this Cloud project.";
  }
  try {
    const parsed = JSON.parse(message) as { error?: { message?: string; status?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    // The message is already plain text.
  }
  return message.length > 280 ? `${message.slice(0, 280)}…` : message;
}

export function needsConsent(error: unknown) {
  const message = (error instanceof Error ? error.message : "").toLowerCase();
  return (
    message.includes("interaction_required") ||
    message.includes("consent_required") ||
    message.includes("login_required") ||
    message.includes("sign in again")
  );
}
