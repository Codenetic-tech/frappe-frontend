import { useState, useEffect, useCallback, useRef } from "react";

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes

export function useVersionCheck() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const currentVersionRef = useRef<string | null>(null);

  const checkVersion = useCallback(async () => {
    try {
      // Add timestamp query parameter to bypass browser/proxy cache for version.json
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      const latestVersion = data.version;

      if (!latestVersion) return;

      if (currentVersionRef.current === null) {
        // Initial version setup on app launch
        currentVersionRef.current = latestVersion;
      } else if (currentVersionRef.current !== latestVersion) {
        // Version mismatch detected!
        console.log(`[VersionCheck] New version detected! Current: ${currentVersionRef.current}, New: ${latestVersion}`);
        setHasUpdate(true);
      }
    } catch (err) {
      console.warn("[VersionCheck] Failed to check for application updates:", err);
    }
  }, []);

  useEffect(() => {
    // Initial check on mount
    checkVersion();

    // Periodic polling
    const intervalId = setInterval(checkVersion, CHECK_INTERVAL_MS);

    // Check when user returns to tab
    const handleFocus = () => {
      checkVersion();
    };

    window.addEventListener("focus", handleFocus);

    // Catch Vite / Webpack dynamic import chunk preload failures
    const handlePreloadError = (event: Event) => {
      console.warn("[VersionCheck] Vite chunk preload error detected. Hard reloading application...");
      event.preventDefault();
      window.location.href = window.location.origin + window.location.pathname + "?t=" + Date.now();
    };

    window.addEventListener("vite:preloadError", handlePreloadError);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("vite:preloadError", handlePreloadError);
    };
  }, [checkVersion]);

  const forceRefresh = useCallback(() => {
    window.location.href = window.location.origin + window.location.pathname + "?t=" + Date.now();
  }, []);

  return {
    hasUpdate,
    forceRefresh,
  };
}

export default useVersionCheck;
