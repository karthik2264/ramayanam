import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import { applyTheme, loadPrefs, savePrefs, type Prefs } from "../lib/prefs";

export type ReaderContext = {
  prefs: Prefs;
  updatePrefs: (patch: Partial<Prefs>) => void;
};

export function useReader() {
  return useOutletContext<ReaderContext>();
}

export function Shell() {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());

  useEffect(() => {
    applyTheme(prefs.theme);
  }, [prefs.theme]);

  function update(patch: Partial<Prefs>) {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      savePrefs(next);
      return next;
    });
  }

  return (
    <div className="app">
      <a className="skip" href="#content">
        Skip to reading
      </a>
      <header className="site-header">
        <NavLink to="/" className="brand">
          <span className="brand-mark" lang="sa">
            रामायणम्
          </span>
          <span className="brand-sub">Vālmīki · study desk</span>
        </NavLink>
        <nav className="site-nav" aria-label="Primary">
          <NavLink to="/">Books</NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/saved">Saved</NavLink>
          <NavLink to="/credits">Credits</NavLink>
        </nav>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => update({ theme: prefs.theme === "dark" ? "light" : "dark" })}
          aria-pressed={prefs.theme === "dark"}
        >
          {prefs.theme === "dark" ? "Light" : "Dark"}
        </button>
      </header>
      <main id="content">
        <Outlet context={{ prefs, updatePrefs: update } satisfies ReaderContext} />
      </main>
      <footer className="site-footer">
        <p>
          Sanskrit of Vālmīki. English glosses and translation from{" "}
          <a href="https://www.valmikiramayan.net/">valmikiramayan.net</a>. Personal study copy.
        </p>
      </footer>
    </div>
  );
}
