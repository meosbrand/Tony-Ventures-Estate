import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Menu, X, Home, Building2 } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useState } from "react";

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2 cursor-pointer">
              <Building2 className="h-7 w-7 text-primary" />
              <div className="flex flex-col">
                <span className="font-sans text-lg font-bold leading-tight tracking-tight">
                  Tony Multi
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground leading-none">
                  Ventures
                </span>
              </div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/">
              <Button
                variant={isActive("/") ? "secondary" : "ghost"}
                size="sm"
                data-testid="nav-home"
              >
                Home
              </Button>
            </Link>
            <Link href="/properties">
              <Button
                variant={isActive("/properties") ? "secondary" : "ghost"}
                size="sm"
                data-testid="nav-properties"
              >
                Properties
              </Button>
            </Link>
            <Link href="/admin">
              <Button
                variant={isActive("/admin") || location.startsWith("/admin") ? "secondary" : "ghost"}
                size="sm"
                data-testid="nav-admin"
              >
                Admin
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background pb-4 px-4">
          <div className="flex flex-col gap-1 pt-2">
            <Link href="/" onClick={() => setMobileOpen(false)}>
              <Button
                variant={isActive("/") ? "secondary" : "ghost"}
                className="w-full justify-start"
                data-testid="mobile-nav-home"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <Link href="/properties" onClick={() => setMobileOpen(false)}>
              <Button
                variant={isActive("/properties") ? "secondary" : "ghost"}
                className="w-full justify-start"
                data-testid="mobile-nav-properties"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Properties
              </Button>
            </Link>
            <Link href="/admin" onClick={() => setMobileOpen(false)}>
              <Button
                variant={isActive("/admin") ? "secondary" : "ghost"}
                className="w-full justify-start"
                data-testid="mobile-nav-admin"
              >
                Admin
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
