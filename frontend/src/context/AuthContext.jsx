import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchMe, updateProfile } from "@/lib/api";
import { firebaseAuth, googleProvider } from "@/lib/firebase";
import {
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import { toast } from "sonner";

const AuthContext = createContext(null);

// If the app is rendered inside an iframe (e.g. the Emergent preview), cross-origin
// popups are unreliable. Use redirect flow instead.
const inIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

// Errors that indicate popup flow didn't work and we should redirect instead.
const POPUP_FAIL_CODES = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
  "auth/internal-error",
  "auth/cancelled-popup-request",
]);

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

  // Handle redirect-based sign-in result (when signInWithRedirect is used).
  useEffect(() => {
    getRedirectResult(firebaseAuth).catch((e) => {
      if (e?.code && !["auth/no-auth-event"].includes(e.code)) {
        console.warn("getRedirectResult error:", e.code, e.message);
      }
    });
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
    // Inside an iframe (Emergent preview), popups are blocked — redirect right away.
    if (inIframe) {
      try {
        await signInWithRedirect(firebaseAuth, googleProvider);
      } catch (e) {
        toast.error(`Sign-in failed: ${e?.message || e?.code || "unknown error"}`);
      }
      return;
    }

    try {
      await signInWithPopup(firebaseAuth, googleProvider);
      // onIdTokenChanged will load the user
    } catch (e) {
      const code = e?.code || "";
      if (POPUP_FAIL_CODES.has(code)) {
        // Fall back to redirect flow.
        try {
          await signInWithRedirect(firebaseAuth, googleProvider);
          return;
        } catch (re) {
          toast.error(`Sign-in failed: ${re?.message || re?.code || "unknown error"}`);
          return;
        }
      }
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
