import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'stitchsandbox:install-dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /safari/i.test(ua) && !/crios|fxios|edgios|opios|chrome|android/i.test(ua);
  return ios && safari;
}

/**
 * First-time install hint. On browsers that support it, captures the deferred
 * `beforeinstallprompt` and offers a one-tap Install button. On iOS Safari
 * (which has no such event) it explains the Share → Add to Home Screen flow.
 */
export function InstallPrompt(): React.ReactElement | null {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<'prompt' | 'ios' | null>(null);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY)) return;

    if (isIosSafari()) {
      setMode('ios');
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode('prompt');
    };
    const onInstalled = () => {
      setMode(null);
      setDeferred(null);
      localStorage.setItem(DISMISSED_KEY, '1');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!mode) return null;

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
    }
    setMode(null);
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setMode(null);
  };

  return (
    <div className="install-banner" role="dialog" aria-label="Install app">
      <img src="/favicon.svg" alt="" width="34" height="34" className="install-logo" />
      <div className="install-text">
        <strong>Install StitchSandbox</strong>
        {mode === 'ios' ? (
          <span>
            Tap <ShareIcon /> in Safari, then “Add to Home Screen”.
          </span>
        ) : (
          <span>Run it full-screen and offline, like a native app.</span>
        )}
      </div>
      <div className="install-actions">
        {mode === 'prompt' ? (
          <>
            <button className="ghost" onClick={dismiss}>
              Not now
            </button>
            <button className="primary" onClick={install}>
              Install
            </button>
          </>
        ) : (
          <button className="primary" onClick={dismiss}>
            Got it
          </button>
        )}
      </div>
    </div>
  );
}

function ShareIcon(): React.ReactElement {
  return (
    <svg
      className="share-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}
