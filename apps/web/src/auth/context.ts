import { createContext } from "react";
import type { LoginData, RegisterData } from "../api/auth";
import type { UserProfile } from "../api/client";

export interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  hasToken: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
