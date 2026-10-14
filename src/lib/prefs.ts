export type WordOrder = "verse" | "anvaya";
export type ThemeName = "light" | "dark";
export type FontScale = "sm" | "md" | "lg";

export type Prefs = {
  wordOrder: WordOrder;
  showTransliteration: boolean;
  fontScale: FontScale;
  theme: ThemeName;
};

const KEY = "ramayanam.prefs";

function systemTheme(): ThemeName {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function defaultPrefs(): Prefs {
  return {
    wordOrder: "verse",
    showTransliteration: true,
    fontScale: "md",
    theme: systemTheme(),
  };
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPrefs();
    return { ...defaultPrefs(), ...JSON.parse(raw) };
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(prefs: Prefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  const color = theme === "dark" ? "#1a1612" : "#f3ead7";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
}
