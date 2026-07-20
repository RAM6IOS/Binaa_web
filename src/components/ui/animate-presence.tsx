"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

/**
 * Lightweight AnimatePresence replacement.
 * Delays unmounting children by `duration` ms so CSS exit animations can play.
 */
export function AnimatePresence({
  children,
  duration = 200,
}: {
  children: ReactNode;
  duration?: number;
}) {
  const [rendered, setRendered] = useState(children);
  const prevKey = useRef(children);

  useEffect(() => {
    if (children !== prevKey.current) {
      // Child changed - keep old one briefly for exit animation
      const timer = setTimeout(() => {
        setRendered(children);
        prevKey.current = children;
      }, duration);
      return () => clearTimeout(timer);
    }
    setRendered(children);
  }, [children, duration]);

  return <>{rendered}</>;
}
