import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.api.js';
import { TOKEN_KEY } from '../api/axios.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    authApi
      .me()
      .then(({ user: me }) => setUser(me))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const onExpired = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  /** Stores a token + user returned by login or registration. */
  const completeAuth = useCallback(({ token: newToken, user: newUser }) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setUser(newUser);
    setToken(newToken);
    return newUser;
  }, []);

  const login = useCallback(
    async (email, password, role) => completeAuth(await authApi.login({ email, password, role })),
    [completeAuth]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, logout, completeAuth }),
    [user, token, loading, login, logout, completeAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
