"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  role: "listener" | "artist" | "label" | "admin";
} | null;

const UserContext = createContext<{ user: CurrentUser; refresh: () => void }>({
  user: null,
  refresh: () => {},
});

export function useSession() {
  return useContext(UserContext);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, [tick]);

  return (
    <UserContext.Provider value={{ user, refresh: () => setTick((t) => t + 1) }}>
      {children}
    </UserContext.Provider>
  );
}
