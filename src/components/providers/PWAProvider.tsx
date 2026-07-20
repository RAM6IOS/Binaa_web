"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { checkNetworkStatus } from "@/lib/utils/network";
import { syncService } from "@/lib/services/sync-service";
import { WifiOff } from "lucide-react";
import { useParams } from "next/navigation";

const PWAContext = createContext({ isOnline: true });

export const usePWA = () => useContext(PWAContext);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const params = useParams();
  const locale = (params?.locale as string) || "ar";

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
    const updateOnlineStatus = async () => {
      const online = await checkNetworkStatus();
      setIsOnline(online);

      if (online) {
        console.log("[PWA] Connected to internet. Running synchronization...");
        await syncService.sync();
      }
    };

    // Initial check
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
  }, []);

  const alertText =
    locale === "ar"
      ? "أنت الآن بدون اتصال بالإنترنت - يتم حفظ التغييرات محلياً وسيتم مزامنتها تلقائياً عند عودة الشبكة."
      : "Vous êtes hors ligne - les modifications sont enregistrées localement et seront synchronisées une fois connecté.";

  return (
    <PWAContext.Provider value={{ isOnline }}>
      {children}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:w-96 z-50 animate-pulse">
          <div className="bg-amber-600 dark:bg-amber-700 text-white p-4 rounded-xl shadow-2xl flex items-start gap-3 border border-amber-500/30 backdrop-blur-md bg-opacity-95">
            <WifiOff className="w-5 h-5 mt-0.5 shrink-0 text-amber-100" />
            <div className="flex-1 text-sm font-medium leading-normal">
              {alertText}
            </div>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
}
