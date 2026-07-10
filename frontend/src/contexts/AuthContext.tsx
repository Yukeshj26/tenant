"use client";
// contexts/AuthContext.tsx — Global user state (no authentication)

import { createContext, useContext, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  preferred_language: string;
}

interface AuthContextType {
  user: User;
  isLoading: false;
}

const defaultUser: User = {
  id: "default-admin",
  email: "admin@tenantsense.ai",
  full_name: "Admin User",
  role: "admin",
  preferred_language: "en",
};

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  isLoading: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: defaultUser, isLoading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
