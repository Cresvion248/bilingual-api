import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  AudioLines,
  BarChart3,
  BookOpen,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Mic,
  Settings,
  Shield,
  ShieldCheck,
  Workflow,
  X
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/AuthContext";
import LanguageSelector from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/speech-to-text", key: "nav.stt", icon: Mic },
  { to: "/text-to-speech", key: "nav.tts", icon: AudioLines },
  { to: "/pipeline", key: "nav.pipeline", icon: Workflow },
  { to: "/api-keys", key: "nav.apiKeys", icon: KeyRound },
  { to: "/usage", key: "nav.usage", icon: BarChart3 },
  { to: "/docs", key: "nav.apiDocs", icon: BookOpen },
  { to: "/settings", key: "nav.settings", icon: Settings },
  { to: "/privacy", key: "nav.privacy", icon: Shield },
  { to: "/help", key: "nav.help", icon: LifeBuoy }
];

export default function Layout() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = !!(user && user.role === "admin");
  const items = isAdmin ? [...NAV_ITEMS, { to: "/admin", key: "nav.admin", icon: ShieldCheck }] : NAV_ITEMS;

  const navList = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-6">
        <p className="font-heading text-lg font-bold text-foreground">{t("app.name")}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2">{navList}</div>
      <div className="border-t border-border p-4">
        <p className="mb-3 truncate text-xs text-muted-foreground">{user ? user.email : ""}</p>
        <Button variant="outline" className="w-full justify-start gap-3" onClick={() => logout()}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t("nav.logout")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="ltr">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card md:block">
        {sidebarInner}
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)} aria-label="Menu">
          <Menu className="h-5 w-5" />
        </Button>
        <p className="font-heading text-sm font-bold">{t("app.name")}</p>
        <LanguageSelector />
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-border bg-card">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} aria-label={t("common.close")}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {sidebarInner}
          </div>
        </div>
      )}

      <div className="md:pl-64">
        <header className="hidden items-center justify-end gap-4 border-b border-border bg-card px-6 py-3 md:flex">
          <LanguageSelector />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t("app.freeTierNotice")}
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}