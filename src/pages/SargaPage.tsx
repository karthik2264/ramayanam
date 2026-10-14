import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { VerseCard } from "../components/VerseCard";
import { RichText, anchorId } from "../components/RichText";
import { useReader } from "../components/Shell";
import { findKanda, loadCatalog, loadSarga } from "../lib/content";
import { listBookmarks, removeBookmark, saveBookmark, saveProgress } from "../lib/db";
import type { Catalog, KandaId, SargaFile, Verse } from "../lib/types";

function countSlokas(verses: Verse[]) {
  const numbers = new Set(verses.flatMap((verse) => verse.numbers));
  return numbers.size || verses.length;
}

export function SargaPage() {
  const { kandaId = "", sargaNumber = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { prefs, updatePrefs } = useReader();
  const number = Number(sargaNumber);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [sarga, setSarga] = useState<SargaFile | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [jump, setJump] = useState("");

  useEffect(() => {
    let cancelled = false;
    setSarga(null);
    setError("");
    loadCatalog()
      .then(async (loaded) => {
        if (cancelled) return;
        setCatalog(loaded);
        const info = loaded.sargas.find((item) => item.kanda === kandaId && item.number === number);
        if (!info?.available) {
          setError("This chapter is not copied yet.");
          return;
        }
        const file = await loadSarga(kandaId, number);
        if (!cancelled) setSarga(file);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      });
    listBookmarks()
      .then((rows) => {
        if (!cancelled) setSaved(new Set(rows.map((row) => row.verseId)));
      })
      .catch(() => setSaved(new Set()));
    return () => {
      cancelled = true;
    };
  }, [kandaId, number]);

  useEffect(() => {
    if (!sarga) return;
    const verseId = searchParams.get("v");
    if (!verseId) return;
    const node = document.getElementById(anchorId(verseId));
    node?.scrollIntoView({ block: "start" });
  }, [sarga, searchParams]);

  useEffect(() => {
    if (!sarga || !catalog) return;
    const kanda = findKanda(catalog, sarga.kanda);
    let timer = 0;
    const remember = () => {
      const line = 140;
      const nodes = [...document.querySelectorAll<HTMLElement>("[data-verse-id]")];
      const current =
        nodes.find((node) => {
          const box = node.getBoundingClientRect();
          return box.top <= line && box.bottom > line;
        }) ?? nodes.find((node) => node.getBoundingClientRect().top >= 0);
      const verseId = current?.dataset.verseId;
      const verse = sarga.verses.find((item) => item.id === verseId);
      if (!verse || !kanda) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void saveProgress({
          kanda: sarga.kanda,
          sarga: sarga.sarga,
          verseId: verse.id,
          label: verse.label,
          kandaName: kanda.name,
          sargaTitle: sarga.title,
          updatedAt: Date.now(),
        });
      }, 400);
    };
    window.addEventListener("scroll", remember, { passive: true });
    return () => {
      window.removeEventListener("scroll", remember);
      window.clearTimeout(timer);
    };
  }, [sarga, catalog]);

  async function toggleSave(verse: Verse) {
    if (!sarga || !catalog) return;
    const kanda = findKanda(catalog, sarga.kanda);
    if (saved.has(verse.id)) {
      await removeBookmark(verse.id);
      setSaved((current) => {
        const next = new Set(current);
        next.delete(verse.id);
        return next;
      });
      return;
    }
    await saveBookmark({
      verseId: verse.id,
      kanda: sarga.kanda,
      sarga: sarga.sarga,
      label: verse.label,
      kandaName: kanda?.name ?? sarga.kanda,
      sargaTitle: sarga.title,
      snippet: (verse.translation || verse.devanagari).slice(0, 180),
      createdAt: Date.now(),
    });
    setSaved((current) => new Set(current).add(verse.id));
  }

  function goToVerse(event: FormEvent) {
    event.preventDefault();
    if (!sarga) return;
    const target = sarga.verses.find((verse) => verse.numbers.includes(Number(jump)));
    if (!target) return;
    document.getElementById(anchorId(target.id))?.scrollIntoView({ block: "start" });
  }

  if (error) {
    return (
      <div className="page">
        <p className="crumb">
          <Link to={`/kanda/${kandaId}`}>Back</Link>
        </p>
        <p className="error">{error}</p>
      </div>
    );
  }
  if (!sarga || !catalog) return <p className="page quiet">Opening the chapter…</p>;

  const kanda = findKanda(catalog, kandaId);
  const siblings = catalog.sargas.filter((item) => item.kanda === kandaId);
  const next = siblings.find((item) => item.number === number + 1);
  const slokaCount = countSlokas(sarga.verses);

  return (
    <div className="reader" data-scale={prefs.fontScale}>
      <div className="reader-bar">
        <Link className="crumb-link" to={`/kanda/${kandaId}`}>
          {kanda?.sanskrit ?? "Book"}
        </Link>
        <strong>
          Sarga {sarga.sarga}
          <span> · {slokaCount} ślokas</span>
        </strong>
        <div className="segment" role="group" aria-label="Word order">
          <button
            type="button"
            aria-pressed={prefs.wordOrder === "verse"}
            onClick={() => updatePrefs({ wordOrder: "verse" })}
          >
            As written
          </button>
          <button
            type="button"
            aria-pressed={prefs.wordOrder === "anvaya"}
            onClick={() => updatePrefs({ wordOrder: "anvaya" })}
          >
            Meaning order
          </button>
        </div>
        <div className="bar-tools">
          <button type="button" onClick={() => updatePrefs({ showTransliteration: !prefs.showTransliteration })} aria-pressed={prefs.showTransliteration}>
            Transliteration
          </button>
          <div className="segment" role="group" aria-label="Type size">
            {(["sm", "md", "lg"] as const).map((size) => (
              <button key={size} type="button" aria-pressed={prefs.fontScale === size} onClick={() => updatePrefs({ fontScale: size })}>
                {size === "sm" ? "A" : size === "md" ? "A+" : "A++"}
              </button>
            ))}
          </div>
          <form onSubmit={goToVerse}>
            <label htmlFor="jump">Go to</label>
            <input id="jump" inputMode="numeric" value={jump} onChange={(event) => setJump(event.target.value)} placeholder="śloka" />
          </form>
        </div>
      </div>

      <article className="sarga">
        <header className="sarga-head">
          <p className="eyebrow" lang="sa">
            {kanda?.sanskrit} · सर्ग {sarga.sarga}
          </p>
          <h1>{sarga.title}</h1>
          <p className="order-note">
            {prefs.wordOrder === "verse"
              ? "Words follow the śloka. A small number shows where that word sits in the meaning order."
              : "Words follow the translators’ meaning order. A small number shows where that word sits in the written line."}
            {" "}
            Split words undo sandhi, so they may not look identical to the joined śloka.
          </p>
        </header>
        {sarga.introduction.length ? (
          <div className="intro">
            {sarga.introduction.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        ) : null}
        {sarga.verses.map((verse) => (
          <VerseCard
            key={verse.id}
            verse={verse}
            wordOrder={prefs.wordOrder}
            showTransliteration={prefs.showTransliteration}
            saved={saved.has(verse.id)}
            onToggleSave={() => toggleSave(verse)}
          />
        ))}
        {sarga.closing.length ? (
          <details className="closing">
            <summary>Close of the chapter</summary>
            {sarga.closing.map((paragraph, index) => (
              <p key={index}>
                <RichText value={paragraph} />
              </p>
            ))}
          </details>
        ) : null}
        <footer className="sarga-foot">
          <p>
            English glosses and translation by {sarga.translator}. Source:{" "}
            <a href={sarga.sourceUrl}>valmikiramayan.net</a>
          </p>
          {next ? (
            next.available ? (
              <Link to={`/kanda/${kandaId as KandaId}/sarga/${next.number}`}>Next · sarga {next.number}</Link>
            ) : (
              <p>Sarga {next.number} is not copied yet. {next.title}</p>
            )
          ) : null}
        </footer>
      </article>
    </div>
  );
}
