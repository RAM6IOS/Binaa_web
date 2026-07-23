"use client";

import dynamic from "next/dynamic";

const PWAProvider = dynamic(() => import("@/components/providers/PWAProvider").then(m => m.PWAProvider), { ssr: false });

export function PWAProviderLoader({ children }: { children: React.ReactNode }) {
  return <PWAProvider>{children}</PWAProvider>;
}
