import { Link } from "react-router-dom";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "../lib/legal";

export function TermsPage() {
  return (
    <div className="page credits legal">
      <h1>Terms of service</h1>
      <p className="quiet">Last updated {LEGAL_UPDATED}</p>
      <p className="lede">
        रामायणम् (“Ramayanam”, “the reader”) is a free, non-commercial study reader for Vālmīki’s Rāmāyaṇa. By using
        it you agree to these terms. If you do not agree, please do not use the reader.
      </p>

      <section>
        <h2>The service</h2>
        <p>
          The reader shows the Sanskrit verses, word meanings, and English translations of the Rāmāyaṇa. It lets you
          bookmark verses, remember your reading place, and, if you choose, sync these to your own Google Drive. It is
          free, and has no paid features or advertising.
        </p>
      </section>

      <section>
        <h2>The text and translations</h2>
        <p>
          The Sanskrit text is Vālmīki’s ancient epic. The word meanings, prose translations, and notes are taken from{" "}
          <a href="https://www.valmikiramayan.net/">valmikiramayan.net</a>, and they belong to their translators and
          publishers. They are shown here for personal study, with credit on the <Link to="/credits">Credits</Link>{" "}
          page. Do not copy or republish them from this reader for commercial use. If you hold rights in any of this
          material and want it changed or removed, write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>Your Google account</h2>
        <p>
          Drive sync is optional. If you use it, you sign in with your own Google account, and Google’s terms apply to
          that account. The reader uses only the <code>drive.file</code> permission, which lets it reach the one file
          it creates. You can stop at any time by signing out, or by removing the reader’s access in your Google
          Account. The <Link to="/privacy">privacy policy</Link> explains exactly what is stored and where.
        </p>
      </section>

      <section>
        <h2>Your data is yours</h2>
        <p>
          Your bookmarks and reading place are kept in your browser and in your own Google Drive. You are responsible
          for keeping copies you care about. Clearing your browser’s data, or deleting the <em>Ramayanam</em> folder in
          Drive, removes them, and the site’s operator cannot get them back.
        </p>
      </section>

      <section>
        <h2>Fair use of the site</h2>
        <p>
          Please do not try to disrupt the site, overload it with automated requests, or use it to break any law.
        </p>
      </section>

      <section>
        <h2>No warranty</h2>
        <p>
          The reader is provided “as is” and “as available”, without warranties of any kind, express or implied. It
          may contain errors in the text, translation, or transliteration, and it may change, pause, or stop at any
          time without notice. It is a study aid, not an authoritative edition.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent the law allows, the site’s operator is not liable for any indirect, incidental, or
          consequential loss arising from your use of the reader, including lost bookmarks or sync data. Because the
          reader is free, the operator’s total liability for any claim is limited to zero.
        </p>
      </section>

      <section>
        <h2>Changes to these terms</h2>
        <p>
          These terms may be updated. The new version will be posted on this page with a new date. If you keep using
          the reader after a change, that means you accept the new terms.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </div>
  );
}
