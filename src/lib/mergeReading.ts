import type { Bookmark, BookmarkTombstone, Progress, ReadingFile } from "./types";

function bookmarkOk(value: unknown): value is Bookmark {
  if (!value || typeof value !== "object") return false;
  const row = value as Bookmark;
  return (
    typeof row.verseId === "string" &&
    row.verseId.length > 0 &&
    typeof row.kanda === "string" &&
    typeof row.sarga === "number" &&
    typeof row.label === "string" &&
    typeof row.createdAt === "number"
  );
}

function progressOk(value: unknown): value is Progress {
  if (!value || typeof value !== "object") return false;
  const row = value as Progress;
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.kanda === "string" &&
    typeof row.sarga === "number" &&
    typeof row.verseId === "string" &&
    typeof row.updatedAt === "number"
  );
}

function tombstoneOk(value: unknown): value is BookmarkTombstone {
  if (!value || typeof value !== "object") return false;
  const row = value as BookmarkTombstone;
  return typeof row.verseId === "string" && row.verseId.length > 0 && typeof row.deletedAt === "number";
}

export function emptyReading(): ReadingFile {
  return { version: 1, bookmarks: [], progress: [], removedBookmarks: [] };
}

export function normalizeReading(value: unknown): ReadingFile {
  if (!value || typeof value !== "object") return emptyReading();
  const raw = value as Partial<ReadingFile>;
  if (raw.version !== 1) throw new Error("The Drive file is from a newer reader. Update this copy, then sync again.");
  return {
    version: 1,
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks.filter(bookmarkOk) : [],
    progress: Array.isArray(raw.progress) ? raw.progress.filter(progressOk) : [],
    removedBookmarks: Array.isArray(raw.removedBookmarks) ? raw.removedBookmarks.filter(tombstoneOk) : [],
  };
}

export function canonicalReading(file: ReadingFile) {
  return JSON.stringify({
    version: 1,
    bookmarks: [...file.bookmarks].sort((a, b) => a.verseId.localeCompare(b.verseId)),
    progress: [...file.progress].sort((a, b) => a.id.localeCompare(b.id)),
    removedBookmarks: [...file.removedBookmarks].sort((a, b) => a.verseId.localeCompare(b.verseId)),
  });
}

export function mergeReading(local: ReadingFile, remote: ReadingFile | null): ReadingFile {
  if (!remote) return local;
  const removed = new Map<string, number>();
  for (const item of [...local.removedBookmarks, ...remote.removedBookmarks]) {
    removed.set(item.verseId, Math.max(removed.get(item.verseId) ?? 0, item.deletedAt));
  }
  const bookmarks = new Map<string, Bookmark>();
  for (const bookmark of [...remote.bookmarks, ...local.bookmarks]) {
    const current = bookmarks.get(bookmark.verseId);
    if (!current || bookmark.createdAt >= current.createdAt) bookmarks.set(bookmark.verseId, bookmark);
  }
  for (const [verseId, deletedAt] of removed) {
    const bookmark = bookmarks.get(verseId);
    if (bookmark && bookmark.createdAt > deletedAt) removed.delete(verseId);
    else bookmarks.delete(verseId);
  }
  const progress = new Map<string, Progress>();
  for (const row of [...remote.progress, ...local.progress]) {
    const current = progress.get(row.id);
    if (!current || row.updatedAt >= current.updatedAt) progress.set(row.id, row);
  }
  return {
    version: 1,
    bookmarks: [...bookmarks.values()],
    progress: [...progress.values()],
    removedBookmarks: [...removed.entries()].map(([verseId, deletedAt]) => ({ verseId, deletedAt })),
  };
}
