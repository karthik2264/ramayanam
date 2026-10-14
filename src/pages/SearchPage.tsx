import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadAvailableSargas, loadCatalog } from "../lib/content";
import { chapterPath } from "../lib/db";
import type { Catalog, SargaFile } from "../lib/types";

type Hit = {
  kandaName: string;
  sargaTitle: string;
  kanda: SargaFile["kanda"];
  sarga: number;
  verseId: string;
  label: string;
  snippet: string;
};

export function SearchPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [sargas, setSargas] = useState<SargaFile[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadCatalog()
      .then(async (loaded) => {
        setCatalog(loaded);
        setSargas(await loadAvailableSargas(loaded));
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const hits = useMemo(() => search(catalog, sargas, query), [catalog, sargas, query]);

  return (
    <div className="page">
      <h1>Search</h1>
      <p className="lede">Sanskrit, transliteration, word meanings, and the English sentence. Copied chapters only.</p>
      <form className="search-form" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="q">Find</label>
        <input
          id="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rāma, nāradam, तपः"
          autoComplete="off"
        />
      </form>
      {error ? <p className="error">{error}</p> : null}
      {query.trim().length >= 2 ? <p className="quiet">{hits.length} found</p> : <p className="quiet">Type at least two characters.</p>}
      <ul className="results">
        {hits.map((hit) => (
          <li key={`${hit.verseId}-${hit.snippet}`}>
            <Link to={chapterPath(hit.kanda, hit.sarga, hit.verseId)}>
              <span>
                {hit.kandaName} · sarga {hit.sarga} · {hit.label}
              </span>
              <strong>{hit.snippet}</strong>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function search(catalog: Catalog | null, sargas: SargaFile[], query: string): Hit[] {
  const needle = query.trim().toLowerCase();
  if (!catalog || needle.length < 2) return [];
  const hits: Hit[] = [];
  for (const sarga of sargas) {
    const kandaName = catalog.kandas.find((kanda) => kanda.id === sarga.kanda)?.name ?? sarga.kanda;
    for (const verse of sarga.verses) {
      const blob = [
        verse.devanagari,
        verse.iast,
        verse.translation,
        ...verse.glosses.flatMap((gloss) => [gloss.devanagari, gloss.iast, gloss.itrans, gloss.meaning]),
      ]
        .join("\n")
        .toLowerCase();
      const at = blob.indexOf(needle);
      if (at < 0) continue;
      hits.push({
        kandaName,
        sargaTitle: sarga.title,
        kanda: sarga.kanda,
        sarga: sarga.sarga,
        verseId: verse.id,
        label: verse.label,
        snippet: snippet(blob, at, needle.length),
      });
      if (hits.length >= 40) return hits;
    }
  }
  return hits;
}

function snippet(text: string, at: number, length: number) {
  const start = Math.max(0, at - 48);
  const end = Math.min(text.length, at + length + 72);
  const slice = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`;
}
