import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

const ADMIN_EMAIL = "bebe23@gmail.com";
const ADMIN_PASSWORD = "beboGCM#123";
const STORAGE_KEY = "gcm_admin_session";

interface AuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  isLoggedIn: boolean;
  loginWithEmail: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  isLoading: false,
  isLoggedIn: false,
  loginWithEmail: () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const loginWithEmail = useCallback(
    (email: string, password: string): boolean => {
      if (
        email.trim().toLowerCase() === ADMIN_EMAIL &&
        password.trim() === ADMIN_PASSWORD
      ) {
        setIsAdmin(true);
        localStorage.setItem(STORAGE_KEY, "true");
        return true;
      }
      return false;
    },
    [],
  );

  const logout = useCallback(() => {
    setIsAdmin(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAdmin,
        isLoading: false,
        isLoggedIn: isAdmin,
        loginWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
