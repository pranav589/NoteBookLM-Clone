"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "../../lib/api-client";

interface User {
  _id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;   // true while the initial /auth/me check is in flight
  initialized: boolean; // true once the first /auth/me check completes (success or fail)
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);

    // Use raw axios throughout so we don't trigger the 401 interceptor on these
    // auth-bootstrap calls (which would cause another attempt loop).
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const rawAxios = (await import("axios")).default;

    const fetchMe = () =>
      rawAxios.get<{ user: User }>(`${BACKEND_URL}/api/auth/me`, {
        withCredentials: true,
      });

    try {
      // 1. Try with the current access token
      const response = await fetchMe();
      setUser(response.data.user);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        // 2. Access token missing/expired — try to silently refresh
        try {
          await rawAxios.post(
            `${BACKEND_URL}/api/auth/refresh`,
            {},
            { withCredentials: true }
          );
          // 3. Refresh succeeded → backend set a new access_token cookie → retry /me
          const retryResponse = await fetchMe();
          setUser(retryResponse.data.user);
        } catch {
          // 4. Refresh also failed → user is genuinely logged out
          setUser(null);
        }
      } else {
        // Non-401 error (network, server error, etc.)
        setUser(null);
      }
    } finally {
      setIsLoading(false);
      setInitialized(true);
    }
  }, []);

  // Run exactly once on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed on server:", err);
    } finally {
      setUser(null);
      setInitialized(true);
      // Hard redirect so all state is cleared cleanly
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, initialized, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
