import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Menu, X, Home, Building2, ChevronRight } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useState, useEffect } from "react";

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => location === path;

  return (
    <nav
      className={`sticky top-0 z-[100] transition-all duration-300 ${
        scrolled
          ? "glass border-b shadow-sm"
          : "bg-background/60 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-105">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-lg font-bold leading-tight tracking-tight">
                  Tony Multi
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground leading-none">
                  Ventures
                </span>
              </div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1 bg-muted/40 rounded-full px-1.5 py-1">
            {[
              { href: "/", label: "Home" },
              { href: "/properties", label: "Properties" },
              { href: "/admin", label: "Admin" },
            ].map((link) => (
              <Link key={link.href} href={link.href}>
                <button
                  className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive(link.href) || (link.href === "/admin" && location.startsWith("/admin"))
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </button>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              className="rounded-full transition-transform duration-200 hover:scale-105"
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4 transition-transform duration-300" />
              ) : (
                <Sun className="h-4 w-4 transition-transform duration-300" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden rounded-full"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t glass pb-4 px-4">
          <div className="flex flex-col gap-1 pt-3">
            {[
              { href: "/", label: "Home", icon: Home },
              { href: "/properties", label: "Properties", icon: Building2 },
              { href: "/admin", label: "Admin", icon: ChevronRight },
            ].map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={isActive(link.href) ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                  data-testid={`mobile-nav-${link.label.toLowerCase()}`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
