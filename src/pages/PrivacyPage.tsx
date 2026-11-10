import { Link } from "react-router-dom";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "../lib/legal";

export function PrivacyPage() {
  return (
    <div className="page credits legal">
      <h1>Privacy policy</h1>
      <p className="quiet">Last updated {LEGAL_UPDATED}</p>
      <p className="lede">
        This reader has no server of its own and no user accounts. It does not collect, sell, or share your data. Your
        bookmarks and reading place stay in your browser and, if you choose, in your own Google Drive.
      </p>

      <section>
        <h2>Who runs this site</h2>
        <p>
          रामायणम् (“Ramayanam”) is a free, non-commercial study reader for Vālmīki’s Rāmāyaṇa. It is run by one
          person. You can reach them at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>What is stored, and where</h2>
        <p>The reader saves a few things so it can remember you between visits. All of it stays on your device:</p>
        <ul>
          <li>
            <strong>Bookmarks and reading place</strong>: the verse, book, and chapter you saved, a short excerpt of the
            verse, and the time you saved it. These are kept in your browser’s IndexedDB.
          </li>
          <li>
            <strong>Reading preferences</strong>: light or dark theme, text size, word order, and whether to show
            transliteration. These are kept in your browser’s localStorage.
          </li>
          <li>
            <strong>Drive sync state</strong>: whether you connected Google Drive on this browser, and when it last
            synced. These are kept in localStorage.
          </li>
          <li>
            <strong>Offline copy of the text</strong>: the app’s files and the verse files you open, kept in the browser
            cache so the reader works without a network.
          </li>
        </ul>
        <p>
          None of this is sent to the site’s operator. You can delete all of it by clearing this site’s data in your
          browser settings.
        </p>
      </section>

      <section>
        <h2>Google Drive sync (optional)</h2>
        <p>
          On the <Link to="/saved">Saved</Link> page you can sign in with Google to keep your bookmarks and reading
          place the same across your devices. If you never sign in, nothing on this page applies to you.
        </p>
        <p>When you sign in:</p>
        <ul>
          <li>
            The reader asks for one permission, <code>drive.file</code>. With it, the reader can see and change only the
            files it creates itself. It cannot see, read, or list any other file in your Drive.
          </li>
          <li>
            It creates one folder and one file, <strong>My Drive / Ramayanam / reading.json</strong>. That file holds
            your bookmarks, reading place, and a list of bookmarks you removed, so a removal syncs to your other
            devices too.
          </li>
          <li>
            Your browser talks to Google directly. Google gives your browser an access token, which is kept in memory
            for this visit only and used just to read and write that one file. The token is not saved, and it never
            reaches the site’s operator or anyone else.
          </li>
          <li>
            The reader does not ask for or receive your name, email address, profile, or contacts.
          </li>
        </ul>
        <p>
          Signing in loads Google’s sign-in script from <code>accounts.google.com</code>. Google’s handling of that
          sign-in is covered by the <a href="https://policies.google.com/privacy">Google Privacy Policy</a>.
        </p>
      </section>

      <section>
        <h2>Google API Services User Data Policy</h2>
        <p>
          This reader’s use of information received from Google APIs adheres to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Data from your Drive is used only to show and sync your own
          bookmarks and reading place inside this reader. It is not transferred to anyone, used for advertising, sold,
          used to train AI or machine-learning models, or read by any person.
        </p>
      </section>

      <section>
        <h2>Removing your data</h2>
        <ul>
          <li>
            <strong>Stop syncing</strong>: choose <em>Sign out</em> on the Saved page. This revokes the access token for
            that browser.
          </li>
          <li>
            <strong>Remove the reader’s access entirely</strong>: go to{" "}
            <a href="https://myaccount.google.com/connections">your Google Account’s third-party connections</a> and
            remove this app.
          </li>
          <li>
            <strong>Delete the synced file</strong>: delete the <em>Ramayanam</em> folder from your Google Drive.
          </li>
          <li>
            <strong>Delete local data</strong>: clear this site’s data in your browser settings.
          </li>
        </ul>
        <p>The site’s operator holds no copy, so there is nothing else to ask them to delete.</p>
      </section>

      <section>
        <h2>No tracking</h2>
        <p>
          The reader has no analytics, advertising, tracking pixels, or third-party cookies. Fonts are bundled with the
          app and not loaded from a font service.
        </p>
      </section>

      <section>
        <h2>Hosting</h2>
        <p>
          The site is a set of static files on Amazon Web Services. Like any web host, AWS may record standard request
          logs, such as IP address, browser type, and the time of a request, for security and delivery. These logs do
          not contain your bookmarks or Drive data, and the site’s operator does not use them to identify anyone.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          The reader is not aimed at children under 13. It does not knowingly collect personal information from anyone,
          including children.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If this policy changes, the new version will be posted on this page with a new date. If the reader ever needs
          a wider Google permission, it will ask you again in Google’s consent screen before using it.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about privacy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also the{" "}
          <Link to="/terms">terms of service</Link>.
        </p>
      </section>
    </div>
  );
}
