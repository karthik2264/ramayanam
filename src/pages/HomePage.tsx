import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadCatalog } from "../lib/content";
import { chapterPath, getLastProgress } from "../lib/db";
import type { Catalog, Progress } from "../lib/types";

export function HomePage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCatalog().then(setCatalog).catch((reason: Error) => setError(reason.message));
    getLastProgress().then(setProgress).catch(() => setProgress(null));
  }, []);

  const ready = catalog?.sargas.filter((sarga) => sarga.available).length ?? 0;

  return (
    <div className="page home">
      <p className="epigraph" lang="sa">
        तपःस्वाध्यायनिरतं तपस्वी वाग्विदां वरम् ।
        <br />
        नारदं परिपप्रच्छ वाल्मीकिर्मुनिपुङ्गवम् ॥
      </p>
      <h1>Read the Rāmāyaṇa one śloka at a time.</h1>
      <p className="lede">
        Seven books. Each chapter is a sarga, and each sarga is a sequence of ślokas. The Sanskrit line stays in the
        order Vālmīki wrote. The word meanings can follow that order, or the meaning order used by the translators.
      </p>
      {progress ? (
        <Link className="continue" to={chapterPath(progress.kanda, progress.sarga, progress.verseId)}>
          <span>Continue</span>
          <strong>
            {progress.kandaName} · sarga {progress.sarga}
          </strong>
          <em>Śloka {progress.label}</em>
        </Link>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <ol className="kanda-list">
        {(catalog?.kandas ?? []).map((kanda, index) => {
          const chapters = catalog?.sargas.filter((sarga) => sarga.kanda === kanda.id) ?? [];
          const copied = chapters.filter((sarga) => sarga.available).length;
          return (
            <li key={kanda.id}>
              <Link to={`/kanda/${kanda.id}`}>
                <span className="kanda-index">{index + 1}</span>
                <span>
                  <span className="kanda-sa" lang="sa">
                    {kanda.sanskrit}
                  </span>
                  <span className="kanda-name">{kanda.name}</span>
                  <span className="kanda-gloss">{kanda.gloss}</span>
                </span>
                <span className="kanda-status">{copied ? `${copied} chapter${copied === 1 ? "" : "s"} copied` : "Not copied yet"}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="quiet">{ready ? `${ready} chapter${ready === 1 ? "" : "s"} on this desk so far.` : "Loading the books…"}</p>
    </div>
  );
}
