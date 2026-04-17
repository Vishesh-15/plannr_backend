import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;

    if (!sessionId) {
      navigate("/", { replace: true });
      return;
    }

    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        setUser(data.user);
        window.history.replaceState(null, "", window.location.pathname);
        const target = data.user?.profile_type ? "/dashboard" : "/onboarding";
        navigate(target, { replace: true, state: { user: data.user } });
      } catch (e) {
        setError("Sign-in failed. Please try again.");
        setTimeout(() => navigate("/", { replace: true }), 1500);
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground" data-testid="auth-callback">
      <div className="text-sm text-muted-foreground font-mono">
        {error ? error : "Signing you in…"}
      </div>
    </div>
  );
}
