import type { Verse } from "../lib/types";
import type { WordOrder } from "../lib/prefs";
import { RichText, anchorId } from "./RichText";

type VerseCardProps = {
  verse: Verse;
  wordOrder: WordOrder;
  showTransliteration: boolean;
  showTelugu: boolean;
  saved: boolean;
  onToggleSave: () => void;
};

export function VerseCard({ verse, wordOrder, showTransliteration, showTelugu, saved, onToggleSave }: VerseCardProps) {
  const placed = verse.glosses
    .filter((gloss) => gloss.verseIndex != null)
    .sort((a, b) => (a.verseIndex ?? 0) - (b.verseIndex ?? 0) || a.anvayaIndex - b.anvayaIndex);
  const unplaced = verse.glosses
    .filter((gloss) => gloss.verseIndex == null)
    .sort((a, b) => a.anvayaIndex - b.anvayaIndex);
  const anvaya = [...verse.glosses].sort((a, b) => a.anvayaIndex - b.anvayaIndex);
  const teluguLines = showTelugu && verse.telugu ? verse.telugu.split("\n").filter(Boolean) : [];
  const lines = verse.devanagari.split("\n").filter(Boolean);

  return (
    <article className="verse" id={anchorId(verse.id)} data-verse-id={verse.id}>
      <header className="verse-head">
        <p className="verse-label">{verse.label}</p>
        <button type="button" className={saved ? "save saved" : "save"} onClick={onToggleSave} aria-pressed={saved}>
          {saved ? "Saved" : "Save"}
        </button>
      </header>
      <div className="sloka" lang="sa">
        {lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
      {teluguLines.length ? (
        <div className="sloka-te" lang="te">
          {teluguLines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      ) : null}
      {showTransliteration && verse.iast ? (
        <p className="iast" lang="sa">
          {verse.iast.split("\n").join(" ")}
        </p>
      ) : null}
      {wordOrder === "verse" ? (
        <>
          <ol className="glosses">
            {placed.map((gloss) => (
              <GlossRow key={`${gloss.anvayaIndex}-${gloss.itrans}`} gloss={gloss} showTelugu={showTelugu} meta={`meaning ${gloss.anvayaIndex + 1}`} />
            ))}
          </ol>
          {unplaced.length ? (
            <div className="unplaced">
              <p>Not in the written line. The translators supplied these, or the alignment could not place them.</p>
              <ol className="glosses">
                {unplaced.map((gloss) => (
                  <GlossRow key={`${gloss.anvayaIndex}-${gloss.itrans}`} gloss={gloss} showTelugu={showTelugu} meta={`meaning ${gloss.anvayaIndex + 1}`} />
                ))}
              </ol>
            </div>
          ) : null}
        </>
      ) : (
        <ol className="glosses">
          {anvaya.map((gloss) => (
            <GlossRow
              key={`${gloss.anvayaIndex}-${gloss.itrans}`}
              gloss={gloss}
              showTelugu={showTelugu}
              meta={gloss.verseIndex == null ? "added" : `written ${gloss.verseIndex + 1}`}
            />
          ))}
        </ol>
      )}
      {verse.translation ? <p className="translation">{verse.translation}</p> : null}
      {showTelugu && verse.translationTe ? (
        <p className="translation translation-te" lang="te">
          <span className="te-tag">తాత్పర్యం</span>
          {verse.translationTe}
        </p>
      ) : null}
      {verse.notes.length ? (
        <details className="notes">
          <summary>Notes</summary>
          {verse.notes.map((note, index) => (
            <p key={index}>
              <RichText value={note} />
            </p>
          ))}
        </details>
      ) : null}
    </article>
  );
}

function GlossRow({
  gloss,
  meta,
  showTelugu,
}: {
  gloss: Verse["glosses"][number];
  meta: string;
  showTelugu: boolean;
}) {
  return (
    <li className="gloss">
      <div className="gloss-word">
        <span className="gloss-dev" lang="sa">
          {gloss.devanagari || gloss.iast}
        </span>
        {showTelugu && gloss.telugu ? (
          <span className="gloss-te" lang="te">
            {gloss.telugu}
          </span>
        ) : null}
        {gloss.iast && gloss.devanagari ? <span className="gloss-iast">{gloss.iast}</span> : null}
      </div>
      <p className="gloss-mean">
        {gloss.meaning}
        <span className="gloss-meta">{meta}</span>
        {showTelugu && gloss.meaningTe ? (
          <span className="gloss-mean-te" lang="te">
            {gloss.meaningTe}
          </span>
        ) : null}
      </p>
    </li>
  );
}
