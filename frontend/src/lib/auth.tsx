"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, AuthUser } from "./api";

interface AuthContextType {
  user: AuthUser | null;
  activeRole: string | null;
  setActiveRole: (role: string) => void;
  login: (collegeEmail: string, password?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeRole, setActiveRoleState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const u = await api.getCurrentUser();
      setUser(u);
      // Auto select primary role if not set
      if (u.roles && u.roles.length > 0) {
        const storedRole = localStorage.getItem("prisms_active_role");
        const match = u.roles.find((r) => r.code === storedRole);
        if (match) {
          setActiveRoleState(match.code);
        } else {
          setActiveRoleState(u.roles[0].code);
          localStorage.setItem("prisms_active_role", u.roles[0].code);
        }
      }
    } catch {
      setUser(null);
      setActiveRoleState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const setActiveRole = (role: string) => {
    setActiveRoleState(role);
    localStorage.setItem("prisms_active_role", role);
  };

  const login = async (collegeEmail: string, password = "ChangeMe-Dev-123") => {
    await api.login({ email: collegeEmail, password });
    const fullUser = await api.getCurrentUser();
    setUser(fullUser);
    if (fullUser.roles && fullUser.roles.length > 0) {
      const firstRole = fullUser.roles[0].code;
      setActiveRoleState(firstRole);
      localStorage.setItem("prisms_active_role", firstRole);
      if (firstRole === "STUDENT") {
        router.push("/student/dashboard");
      } else {
        router.push("/faculty/dashboard");
      }
    }
    return fullUser;
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setActiveRoleState(null);
      localStorage.removeItem("prisms_active_role");
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        setActiveRole,
        login,
        logout,
        loading,
        refreshUser,
      }}
    >
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
