import type { UiError } from "../api/error";
import { createContext } from "react";
import type { LoginData, RegisterData } from "../api/auth";
import type { UserProfile } from "../api/client";

export interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  error: UiError | null;
  sessionExpired: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
