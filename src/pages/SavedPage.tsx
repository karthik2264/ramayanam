import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { chapterPath, getLastProgress, listBookmarks, removeBookmark } from "../lib/db";
import type { Bookmark, Progress } from "../lib/types";

export function SavedPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    listBookmarks().then(setBookmarks).catch(() => setBookmarks([]));
    getLastProgress().then(setProgress).catch(() => setProgress(null));
  }, []);

  async function forget(verseId: string) {
    await removeBookmark(verseId);
    setBookmarks((current) => current.filter((bookmark) => bookmark.verseId !== verseId));
  }

  return (
    <div className="page">
      <h1>Saved</h1>
      <p className="lede">Bookmarks and the last place you were reading stay in this browser.</p>
      {progress ? (
        <Link className="continue" to={chapterPath(progress.kanda, progress.sarga, progress.verseId)}>
          <span>Last read</span>
          <strong>
            {progress.kandaName} · sarga {progress.sarga}
          </strong>
          <em>Śloka {progress.label}</em>
        </Link>
      ) : (
        <p className="quiet">No reading place yet. Open a chapter and scroll.</p>
      )}
      {bookmarks.length === 0 ? (
        <p className="quiet">No saved ślokas yet.</p>
      ) : (
        <ul className="results">
          {bookmarks.map((bookmark) => (
            <li key={bookmark.verseId}>
              <Link to={chapterPath(bookmark.kanda, bookmark.sarga, bookmark.verseId)}>
                <span>
                  {bookmark.kandaName} · sarga {bookmark.sarga} · {bookmark.label}
                </span>
                <strong>{bookmark.snippet}</strong>
              </Link>
              <button type="button" className="text-button" onClick={() => forget(bookmark.verseId)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
