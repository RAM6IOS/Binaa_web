"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { checkNetworkStatus } from "@/lib/utils/network";
import { syncService } from "@/lib/services/sync-service";
import {
  formatOfflineRemaining,
  getOfflineWindowStatus,
} from "@/lib/utils/offline-window";
import { useTranslations } from "next-intl";
import { Lock, WifiOff } from "lucide-react";

const PWAContext = createContext({ isOnline: true });

export const usePWA = () => useContext(PWAContext);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState(() => Date.now());
  const t = useTranslations("PWA");

  const updateOnlineStatus = useCallback(async () => {
    const online = await checkNetworkStatus();
    setIsOnline(online);
    setLastCheckedAt(Date.now());

    if (online) {
      console.log("[PWA] Connected to internet. Running synchronization...");
      await syncService.sync();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isProduction = process.env.NODE_ENV === "production";

    if (!isProduction) {
      // In development: unregister any stale Service Worker to avoid interfering with HMR
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          reg.unregister().then(() =>
            console.log("[PWA] Dev mode: unregistered stale Service Worker")
          );
        });
      });
      return;
    }

    // Production only: register Service Worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PWA] Service Worker registered with scope:", reg.scope);
        // Register background sync if supported
        if ("sync" in reg) {
          (reg as any).sync
            .register("sync-queue")
            .catch((err: any) =>
              console.warn("[PWA] Background Sync registration failed:", err)
            );
        }

        // نسخة جديدة متاحة؟ حدّث الـ app shell في الخلفية عند عودة الاتصال
        const onOnlineRefetch = () => {
          reg.update().catch((err: any) =>
            console.warn("[PWA] SW update check failed:", err)
          );
        };
        window.addEventListener("online", onOnlineRefetch);
        return () => window.removeEventListener("online", onOnlineRefetch);
      })
      .catch((err) =>
        console.error("[PWA] Service Worker registration failed:", err)
      );

    // Listen to messages from Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "TRIGGER_SYNC") {
        console.log("[PWA] SW triggered sync message received");
        syncService.sync();
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    // Monitor connectivity
    updateOnlineStatus();

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Periodically verify connection (every 10s) to avoid false-positives
    const intervalId = setInterval(updateOnlineStatus, 10000);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      clearInterval(intervalId);
    };
  }, [updateOnlineStatus]);

  const windowStatus = getOfflineWindowStatus(lastCheckedAt);
  const readOnly = !isOnline && !windowStatus.withinWindow;
  const remainingText = formatOfflineRemaining(windowStatus.remainingMs);

  return (
    <PWAContext.Provider value={{ isOnline }}>
      {children}
      {!isOnline && (
        <div
          className={
            readOnly
              ? "fixed bottom-4 left-4 right-4 md:left-auto md:w-96 z-50"
              : "fixed bottom-4 left-4 right-4 md:left-auto md:w-96 z-50 animate-pulse"
          }
        >
          <div
            className={
              readOnly
                ? "bg-destructive text-destructive-foreground p-4 rounded-lg shadow-sm flex items-start gap-3 border border-destructive-foreground/20"
                : "bg-warning text-warning-foreground p-4 rounded-lg shadow-sm flex items-start gap-3 border border-warning-foreground/20"
            }
          >
            {readOnly ? (
              <Lock className="w-5 h-5 mt-0.5 shrink-0 text-destructive-foreground" />
            ) : (
              <WifiOff className="w-5 h-5 mt-0.5 shrink-0 text-warning-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-normal">
                {readOnly ? t("windowExceeded") : t("withinWindow")}
              </p>
              {!readOnly && (
                <p className="text-xs mt-1 opacity-90">
                  {t("withinWindowRemaining", { remaining: remainingText })}
                </p>
              )}
              <button
                type="button"
                onClick={() => updateOnlineStatus()}
                className="mt-2 inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-semibold bg-background/15 hover:bg-background/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <WifiOff className="w-3.5 h-3.5" />
                {t("retry")}
              </button>
            </div>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
}