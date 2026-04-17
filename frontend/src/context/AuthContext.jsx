import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchMe, updateProfile } from "@/lib/api";
import { firebaseAuth, googleProvider } from "@/lib/firebase";
import { onIdTokenChanged, signInWithPopup, signOut } from "firebase/auth";
import { toast } from "sonner";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [fbUser, setFbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsub = onIdTokenChanged(firebaseAuth, async (fu) => {
      setFbUser(fu);
      if (fu) {
        await refresh();
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [refresh]);

  const login = async () => {
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
      // onIdTokenChanged will refresh `user`
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      toast.error(`Sign-in failed: ${e?.message || code}`);
    }
  };

  const logout = async () => {
    try {
      await signOut(firebaseAuth);
    } finally {
      setUser(null);
      setFbUser(null);
      window.location.href = "/";
    }
  };

  const updateMe = async (patch) => {
    const updated = await updateProfile(patch);
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{ user, fbUser, loading, setUser, refresh, login, logout, updateMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
