export function CreditsPage() {
  return (
    <div className="page credits">
      <h1>Credits and source</h1>
      <p className="lede">
        This is a private study reader. It is not a commercial project. If the reading desk proves useful, it can be
        offered to the keepers of the source site, for them to host in place of the older pages.
      </p>
      <section>
        <h2>Sanskrit</h2>
        <p>
          The verses are from Vālmīki’s Rāmāyaṇa, as published on{" "}
          <a href="https://www.valmikiramayan.net/">valmikiramayan.net</a>. The text is the ancient epic. The
          Devanagari on these pages follows that site’s UTF-8 edition.
        </p>
      </section>
      <section>
        <h2>English</h2>
        <p>The word-by-word meanings, prose translations, and notes were completed in 2006:</p>
        <ul>
          <li>Desiraju Hanumanta Rao — Bala, Aranya, and Kishkindha Kandas.</li>
          <li>K. M. K. Murthy (Murali Krishnamurthy Kopalle) — Ayodhya, Sundara, and Yuddha Kandas.</li>
        </ul>
        <p>
          Uttara Kanda will be credited from that book’s own pages when it is copied. The source site’s account of the
          translators is at <a href="https://www.valmikiramayan.net/">valmikiramayan.net</a>.
        </p>
      </section>
      <section>
        <h2>What this desk changes</h2>
        <p>
          The śloka is shown as written. Sanskrit word order is free, so a sentence can be arranged for the metre and
          still mean the same thing. The source site lists words in meaning order, called anvaya: the order in which
          an English sentence would say them. Here you can switch that list back to the order of the written line.
        </p>
        <p>
          Split words undo sandhi, so a word in the list may not look identical to the joined form in the śloka.
          Words the translators added to complete the sense are marked when they do not occur in the line.
        </p>
      </section>
      <section>
        <h2>This copy</h2>
        <p>
          Kept for personal study, with the bucket private. Bookmarks and the reading place are stored in this
          browser, not on a server. Nothing here is sold.
        </p>
      </section>
    </div>
  );
}
