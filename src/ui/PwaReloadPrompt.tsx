import { useRegisterSW } from 'virtual:pwa-register/react';

// While the app stays open, re-check for a freshly deployed version hourly so a
// long-running (e.g. installed) session still picks updates up.
const UPDATE_INTERVAL = 60 * 60 * 1000;

/**
 * Shows a "new version available" banner when a new service worker has been
 * deployed. Reloading applies it (skipWaiting + activate); old precaches are
 * cleaned up by Workbox. We never auto-reload so unsaved canvas work is safe.
 */
export function PwaReloadPrompt(): React.ReactElement | null {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      setInterval(async () => {
        if (registration.installing || !navigator.onLine) return;
        try {
          const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: { 'cache-control': 'no-cache' },
          });
          if (resp.status === 200) await registration.update();
        } catch {
          // Offline or a transient error — we'll try again on the next tick.
        }
      }, UPDATE_INTERVAL);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Update available">
      <img src="/favicon.svg" alt="" width="34" height="34" className="install-logo" />
      <div className="install-text">
        <strong>New version available</strong>
        <span>Reload to update — save your work first if you have unsaved changes.</span>
      </div>
      <div className="install-actions">
        <button className="ghost" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
        <button className="primary" onClick={() => updateServiceWorker(true)}>
          Reload
        </button>
      </div>
    </div>
  );
}
