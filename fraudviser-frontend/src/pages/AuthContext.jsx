import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios.js";
import AuthContext from "./auth-context.js";
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshUser = useCallback(async () => {
    try { const { data } = await api.get("/auth/me"); setUser(data.user); return data.user; }
    catch { setUser(null); return null; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    api.get("/auth/me").then(({ data }) => { if (active) setUser(data.user); }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const value = useMemo(() => ({ user, loading, refreshUser, setUser }), [user, loading, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
