import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { findKanda, loadCatalog, sargasFor } from "../lib/content";
import type { Catalog } from "../lib/types";
import type { KandaId } from "../lib/types";

export function KandaPage() {
  const { kandaId = "" } = useParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCatalog().then(setCatalog).catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) return <p className="page error">{error}</p>;
  if (!catalog) return <p className="page quiet">Loading…</p>;

  const kanda = findKanda(catalog, kandaId);
  if (!kanda) return <p className="page error">That book is not part of this Rāmāyaṇa.</p>;

  const sargas = sargasFor(catalog, kanda.id as KandaId);

  return (
    <div className="page">
      <p className="crumb">
        <Link to="/">Books</Link>
      </p>
      <h1 lang="sa">{kanda.sanskrit}</h1>
      <p className="lede">
        {kanda.name}. {kanda.gloss}. English by {kanda.translator}.
      </p>
      {sargas.length === 0 ? (
        <p>Chapters for this book are not copied yet.</p>
      ) : (
        <ol className="sarga-list">
          {sargas.map((sarga) => (
            <li key={sarga.number}>
              {sarga.available ? (
                <Link to={`/kanda/${kanda.id}/sarga/${sarga.number}`}>
                  <span>Sarga {sarga.number}</span>
                  <span>{sarga.title}</span>
                </Link>
              ) : (
                <div className="sarga-pending">
                  <span>Sarga {sarga.number}</span>
                  <span>{sarga.title}</span>
                  <span>Not copied yet</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
