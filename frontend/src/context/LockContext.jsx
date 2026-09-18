import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { LockScreen } from "@/components/LockScreen";

const LockCtx = createContext(null);
const AUTO_LOCK_MS = 5 * 60 * 1000;

export function LockProvider({ children }) {
  const { user } = useAuth();
  const [locked, setLocked] = useState(() => localStorage.getItem("cocoa_locked") === "1");

  const lock = useCallback(() => {
    setLocked(true);
    localStorage.setItem("cocoa_locked", "1");
  }, []);

  const unlock = useCallback(() => {
    setLocked(false);
    localStorage.removeItem("cocoa_locked");
  }, []);

  // Clear lock state when logged out
  useEffect(() => {
    if (user === false) unlock();
  }, [user, unlock]);

  // Auto-lock after inactivity (only when a PIN is set)
  useEffect(() => {
    if (!user || !user.pin_set) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, AUTO_LOCK_MS);
    };
    reset();
    const events = ["mousemove", "keydown", "click", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user, lock]);

  const showLock = locked && user && user.pin_set;

  return (
    <LockCtx.Provider value={{ locked, lock, unlock }}>
      {children}
      {showLock && <LockScreen onUnlock={unlock} />}
    </LockCtx.Provider>
  );
}

export const useLock = () => useContext(LockCtx);
