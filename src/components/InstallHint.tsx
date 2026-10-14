import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ramayanam.installDismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallHint() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") return;

    if (isIos()) {
      setIosHint(true);
      return;
    }

    function onPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      localStorage.setItem(DISMISS_KEY, "1");
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setPromptEvent(null);
    setIosHint(false);
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") localStorage.setItem(DISMISS_KEY, "1");
  }

  if (!promptEvent && !iosHint) return null;

  return (
    <div className="install-hint" role="region" aria-label="Install the reader">
      <p>
        {iosHint
          ? "To keep this reader on your phone, tap Share, then Add to Home Screen."
          : "Install this reader so it opens like an app and keeps the text offline."}
      </p>
      <div className="install-actions">
        {promptEvent ? (
          <button type="button" className="text-button install-go" onClick={() => void install()}>
            Install
          </button>
        ) : null}
        <button type="button" className="text-button" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
