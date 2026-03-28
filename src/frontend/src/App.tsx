import {
  BookOpen,
  CalendarDays,
  Eye,
  Lock,
  LogOut,
  MapPin,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider, useLang } from "./contexts/LanguageContext";
import ChurchLocator from "./pages/ChurchLocator";
import EducationHub from "./pages/EducationHub";
import Events from "./pages/Events";
import Teams from "./pages/Teams";
import VisionPlan from "./pages/VisionPlan";

type Tab = "churches" | "education" | "events" | "vision" | "teams";

const tabs: { id: Tab; icon: React.ReactNode; labelKey: string }[] = [
  {
    id: "churches",
    icon: <MapPin className="w-5 h-5" />,
    labelKey: "churches",
  },
  {
    id: "education",
    icon: <BookOpen className="w-5 h-5" />,
    labelKey: "education",
  },
  {
    id: "events",
    icon: <CalendarDays className="w-5 h-5" />,
    labelKey: "events",
  },
  { id: "vision", icon: <Eye className="w-5 h-5" />, labelKey: "vision" },
  { id: "teams", icon: <Users className="w-5 h-5" />, labelKey: "teams" },
];

function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("churches");
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const { lang, isRTL, toggleLang, t } = useLang();
  const { isAdmin, loginWithEmail, logout } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const success = loginWithEmail(email, password);
    if (success) {
      setLoginOpen(false);
      setEmail("");
      setPassword("");
    } else {
      setLoginError(
        lang === "ar"
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
          : "Invalid email or password",
      );
    }
  };

  const pageMap: Record<Tab, React.ReactNode> = {
    churches: <ChurchLocator />,
    education: <EducationHub />,
    events: <Events />,
    vision: <VisionPlan />,
    teams: <Teams />,
  };

  return (
    <div
      className="flex flex-col h-screen max-w-[430px] mx-auto bg-background shadow-2xl overflow-hidden"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <span className="text-xs font-bold">GCM</span>
          </div>
          <div>
            {isAdmin && (
              <Badge variant="secondary" className="text-xs h-4 px-1 mt-0.5">
                <Shield className="w-2.5 h-2.5 mr-0.5" />
                {t("managementMode")}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={toggleLang}
          >
            {lang === "en" ? "العربية" : "English"}
          </Button>
          {isAdmin ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setLoginOpen(true)}
            >
              <Lock className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-hidden">{pageMap[activeTab]}</main>

      {/* Bottom Navigation */}
      <nav className="flex border-t bg-background shrink-0">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 px-1 text-xs transition-colors ${
              activeTab === tab.id
                ? "text-primary border-t-2 border-primary -mt-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span className="mt-0.5 text-[10px]">{t(tab.labelKey)}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <footer className="shrink-0 py-1 text-center border-t border-border/40">
        <p className="text-[10px] text-muted-foreground leading-tight">
          Developed By Afraim Farag
        </p>
        <p className="text-[10px] text-muted-foreground leading-tight">
          جميع الحقوق محفوظة © 2026
        </p>
      </footer>

      {/* Login Dialog */}
      <Dialog
        open={loginOpen}
        onOpenChange={(open) => {
          setLoginOpen(open);
          setLoginError("");
        }}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t("adminLogin")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="email">
                {lang === "ar" ? "البريد الإلكتروني" : "Email"}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">
                {lang === "ar" ? "كلمة المرور" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <p className="text-sm text-destructive">{loginError}</p>
            )}
            <Button type="submit" className="w-full">
              <Lock className="w-4 h-4 mr-2" />
              {lang === "ar" ? "دخول" : "Sign In"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </LanguageProvider>
  );
}
