import { useEffect, useState } from "react";

export function useNow(options?: { intervalMs?: number }) {
  const intervalMs = options?.intervalMs ?? 1000;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
